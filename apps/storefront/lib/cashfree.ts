import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const cashfreeApiVersion = "2025-01-01";
const sandboxBaseUrl = "https://sandbox.cashfree.com/pg";
const productionBaseUrl = "https://api.cashfree.com/pg";

type CashfreeEnvironment = Record<string, string | undefined> & {
  CASHFREE_ENV?: string;
  CASHFREE_CLIENT_ID?: string;
  CASHFREE_CLIENT_SECRET?: string;
};

export type CashfreeConfiguration = Readonly<{
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}>;

export function resolveCashfreeConfiguration(
  environment: CashfreeEnvironment = process.env,
): CashfreeConfiguration {
  const mode = environment.CASHFREE_ENV;
  if (mode !== "sandbox" && mode !== "production") {
    throw new Error("CASHFREE_ENV must be sandbox or production");
  }
  if (!environment.CASHFREE_CLIENT_ID || !environment.CASHFREE_CLIENT_SECRET) {
    throw new Error("Cashfree merchant credentials are not configured");
  }
  return {
    baseUrl: mode === "production" ? productionBaseUrl : sandboxBaseUrl,
    clientId: environment.CASHFREE_CLIENT_ID,
    clientSecret: environment.CASHFREE_CLIENT_SECRET,
  };
}

export function amountMinorToCashfreeMajor(amountMinor: number): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("Cashfree amount must be a positive integer number of paise");
  }
  return Number((amountMinor / 100).toFixed(2));
}

export function cashfreeMajorToAmountMinor(amountMajor: number): number {
  if (!Number.isFinite(amountMajor) || amountMajor < 0) {
    throw new Error("Cashfree returned an invalid amount");
  }
  const amountMinor = Math.round(amountMajor * 100);
  if (Math.abs(amountMajor * 100 - amountMinor) > Number.EPSILON * 100) {
    throw new Error("Cashfree returned more than two decimal places");
  }
  return amountMinor;
}

const orderResponseSchema = z.object({
  cf_order_id: z.union([z.string(), z.number()]).transform(String),
  order_id: z.string(),
  order_currency: z.literal("INR"),
  order_amount: z.number().nonnegative(),
  order_status: z.enum([
    "ACTIVE",
    "PAID",
    "EXPIRED",
    "TERMINATED",
    "TERMINATION_REQUESTED",
  ]),
  payment_session_id: z.string().optional(),
});

export type CashfreeOrder = z.infer<typeof orderResponseSchema>;

async function cashfreeRequest(
  path: string,
  init: RequestInit,
  configuration: CashfreeConfiguration,
  fetchImplementation: typeof fetch,
): Promise<unknown> {
  const response = await fetchImplementation(`${configuration.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-version": cashfreeApiVersion,
      "x-client-id": configuration.clientId,
      "x-client-secret": configuration.clientSecret,
      ...init.headers,
    },
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Error(`Cashfree request failed with status ${response.status}`);
  }
  return payload;
}

export async function createCashfreeOrder(
  input: Readonly<{
    orderId: string;
    amountMinor: number;
    idempotencyKey: string;
    customer: Readonly<{ id: string; name: string; email: string; phone: string }>;
    returnUrl: string;
    notifyUrl: string;
  }>,
  dependencies: Readonly<{
    configuration?: CashfreeConfiguration;
    fetchImplementation?: typeof fetch;
  }> = {},
): Promise<CashfreeOrder> {
  if (!/^[0-9a-f-]{36}$/i.test(input.idempotencyKey)) {
    throw new Error("Cashfree idempotency key must be a UUID");
  }
  const configuration =
    dependencies.configuration ?? resolveCashfreeConfiguration();
  const payload = await cashfreeRequest(
    "/orders",
    {
      method: "POST",
      headers: {
        "x-idempotency-key": input.idempotencyKey,
        "x-request-id": input.idempotencyKey,
      },
      body: JSON.stringify({
        order_id: input.orderId,
        order_amount: amountMinorToCashfreeMajor(input.amountMinor),
        order_currency: "INR",
        customer_details: {
          customer_id: input.customer.id,
          customer_name: input.customer.name,
          customer_email: input.customer.email,
          customer_phone: input.customer.phone,
        },
        order_meta: {
          return_url: input.returnUrl,
          notify_url: input.notifyUrl,
        },
      }),
    },
    configuration,
    dependencies.fetchImplementation ?? fetch,
  );
  return orderResponseSchema.parse(payload);
}

async function getCashfreeOrder(
  orderId: string,
  dependencies: Readonly<{
    configuration?: CashfreeConfiguration;
    fetchImplementation?: typeof fetch;
  }> = {},
): Promise<CashfreeOrder> {
  const configuration =
    dependencies.configuration ?? resolveCashfreeConfiguration();
  const payload = await cashfreeRequest(
    `/orders/${encodeURIComponent(orderId)}`,
    { method: "GET" },
    configuration,
    dependencies.fetchImplementation ?? fetch,
  );
  return orderResponseSchema.parse(payload);
}

export async function verifyCashfreeOrderPaid(
  orderId: string,
  expectedAmountMinor: number,
  dependencies: Readonly<{
    configuration?: CashfreeConfiguration;
    fetchImplementation?: typeof fetch;
  }> = {},
): Promise<CashfreeOrder> {
  const order = await getCashfreeOrder(orderId, dependencies);
  if (
    order.order_status !== "PAID" ||
    order.order_currency !== "INR" ||
    cashfreeMajorToAmountMinor(order.order_amount) !== expectedAmountMinor
  ) {
    throw new Error("Cashfree order is not server-verified as paid for the expected amount");
  }
  return order;
}

const refundResponseSchema = z.object({
  cf_payment_id: z.union([z.string(), z.number()]).transform(String),
  cf_refund_id: z.union([z.string(), z.number()]).transform(String),
  refund_id: z.string(),
  order_id: z.string(),
  entity: z.literal("refund"),
  refund_amount: z.number().nonnegative(),
  refund_currency: z.literal("INR"),
  refund_note: z.string(),
  refund_status: z.enum(["SUCCESS", "PENDING", "CANCELLED", "ONHOLD", "FAILED"]),
  status_description: z.string().optional(),
  refund_arn: z.string().nullish(),
});

export type CashfreeRefund = z.infer<typeof refundResponseSchema>;

export async function createCashfreeRefund(
  input: Readonly<{
    orderId: string;
    refundId: string;
    amountMinor: number;
    note: string;
    idempotencyKey: string;
  }>,
  dependencies: Readonly<{
    configuration?: CashfreeConfiguration;
    fetchImplementation?: typeof fetch;
  }> = {},
): Promise<CashfreeRefund> {
  if (!/^[0-9a-f-]{36}$/i.test(input.idempotencyKey)) {
    throw new Error("Cashfree idempotency key must be a UUID");
  }
  if (!input.refundId || !input.note.trim()) {
    throw new Error("Cashfree refund ID and note are required");
  }
  const configuration = dependencies.configuration ?? resolveCashfreeConfiguration();
  const payload = await cashfreeRequest(
    `/orders/${encodeURIComponent(input.orderId)}/refunds`,
    {
      method: "POST",
      headers: {
        "x-idempotency-key": input.idempotencyKey,
        "x-request-id": input.idempotencyKey,
      },
      body: JSON.stringify({
        refund_amount: amountMinorToCashfreeMajor(input.amountMinor),
        refund_id: input.refundId,
        refund_note: input.note,
        refund_speed: "STANDARD",
      }),
    },
    configuration,
    dependencies.fetchImplementation ?? fetch,
  );
  return refundResponseSchema.parse(Array.isArray(payload) ? payload[0] : payload);
}

export function verifyCashfreeWebhookSignature(input: Readonly<{
  rawBody: string;
  signature: string;
  timestamp: string;
  secret: string;
  now?: number;
  maximumSkewMilliseconds?: number;
}>): boolean {
  const timestamp = Number(input.timestamp);
  const maximumSkewMilliseconds = input.maximumSkewMilliseconds ?? 5 * 60 * 1_000;
  const now = input.now ?? Date.now();
  if (
    !Number.isFinite(timestamp) ||
    Math.abs(now - timestamp) > maximumSkewMilliseconds
  ) {
    return false;
  }
  const expected = createHmac("sha256", input.secret)
    .update(`${input.timestamp}${input.rawBody}`, "utf8")
    .digest();
  let received: Buffer;
  try {
    received = Buffer.from(input.signature, "base64");
  } catch {
    return false;
  }
  return received.length === expected.length && timingSafeEqual(received, expected);
}
