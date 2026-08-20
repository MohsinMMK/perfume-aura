import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const cashfreeApiVersion = "2026-01-01";
export const cashfreeWebhookVersion = "2025-01-01";
const cashfreeOrderExpiryMilliseconds = 15 * 60 * 1_000;
const cashfreeUpiPaymentGroups = new Set([
  "upi",
  "upi_credit_card",
  "upi_ppi",
  "upi_ppi_offline",
]);
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
  order_expiry_time: z.string().datetime({ offset: true }).optional(),
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
    now?: Date;
  }> = {},
): Promise<CashfreeOrder> {
  if (!/^[0-9a-f-]{36}$/i.test(input.idempotencyKey)) {
    throw new Error("Cashfree idempotency key must be a UUID");
  }
  const configuration =
    dependencies.configuration ?? resolveCashfreeConfiguration();
  const now = dependencies.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Cashfree order creation time is invalid");
  }
  const orderExpiryTime = new Date(
    now.getTime() + cashfreeOrderExpiryMilliseconds,
  ).toISOString();
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
          payment_methods: "upi",
        },
        order_expiry_time: orderExpiryTime,
      }),
    },
    configuration,
    dependencies.fetchImplementation ?? fetch,
  );
  const order = orderResponseSchema.parse(payload);
  if (
    order.order_id !== input.orderId ||
    order.order_currency !== "INR" ||
    cashfreeMajorToAmountMinor(order.order_amount) !== input.amountMinor
  ) {
    throw new Error("Cashfree created an order that does not match the local request");
  }
  return order;
}

const paymentResponseSchema = z.object({
  cf_payment_id: z.union([z.string(), z.number()]).transform(String),
  order_id: z.string(),
  entity: z.literal("payment"),
  is_captured: z.boolean(),
  order_amount: z.number().nonnegative(),
  order_currency: z.literal("INR"),
  payment_group: z.string(),
  payment_amount: z.number().nonnegative(),
  payment_currency: z.literal("INR"),
  payment_status: z.enum([
    "SUCCESS",
    "NOT_ATTEMPTED",
    "FAILED",
    "USER_DROPPED",
    "VOID",
    "CANCELLED",
    "PENDING",
  ]),
});

export type CashfreePayment = z.infer<typeof paymentResponseSchema>;

export async function getCashfreePayment(
  orderId: string,
  paymentId: string,
  dependencies: Readonly<{
    configuration?: CashfreeConfiguration;
    fetchImplementation?: typeof fetch;
  }> = {},
): Promise<CashfreePayment> {
  if (!orderId || !paymentId) {
    throw new Error("Cashfree order and payment IDs are required");
  }
  const configuration =
    dependencies.configuration ?? resolveCashfreeConfiguration();
  const payload = await cashfreeRequest(
    `/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(paymentId)}`,
    { method: "GET" },
    configuration,
    dependencies.fetchImplementation ?? fetch,
  );
  return paymentResponseSchema.parse(payload);
}

export async function listCashfreePayments(
  orderId: string,
  dependencies: Readonly<{
    configuration?: CashfreeConfiguration;
    fetchImplementation?: typeof fetch;
  }> = {},
): Promise<readonly CashfreePayment[]> {
  if (!orderId) throw new Error("Cashfree order ID is required");
  const configuration = dependencies.configuration ?? resolveCashfreeConfiguration();
  const payload = await cashfreeRequest(
    `/orders/${encodeURIComponent(orderId)}/payments`,
    { method: "GET" },
    configuration,
    dependencies.fetchImplementation ?? fetch,
  );
  return z.array(paymentResponseSchema).parse(payload);
}

export async function getCashfreeOrder(
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
    order.order_id !== orderId ||
    order.order_status !== "PAID" ||
    order.order_currency !== "INR" ||
    cashfreeMajorToAmountMinor(order.order_amount) !== expectedAmountMinor
  ) {
    throw new Error("Cashfree order is not server-verified as paid for the expected amount");
  }
  return order;
}

export async function verifyCashfreePaymentSucceeded(
  input: Readonly<{
    orderId: string;
    paymentId: string;
    expectedAmountMinor: number;
  }>,
  dependencies: Readonly<{
    configuration?: CashfreeConfiguration;
    fetchImplementation?: typeof fetch;
  }> = {},
): Promise<Readonly<{ order: CashfreeOrder; payment: CashfreePayment }>> {
  const [order, payment] = await Promise.all([
    verifyCashfreeOrderPaid(
      input.orderId,
      input.expectedAmountMinor,
      dependencies,
    ),
    getCashfreePayment(input.orderId, input.paymentId, dependencies),
  ]);
  if (
    payment.cf_payment_id !== input.paymentId ||
    payment.order_id !== input.orderId ||
    payment.payment_status !== "SUCCESS" ||
    !payment.is_captured ||
    !cashfreeUpiPaymentGroups.has(payment.payment_group) ||
    cashfreeMajorToAmountMinor(payment.order_amount) !==
      input.expectedAmountMinor ||
    cashfreeMajorToAmountMinor(payment.payment_amount) !== input.expectedAmountMinor
  ) {
    throw new Error(
      "Cashfree payment is not server-verified as a captured UPI success for the expected order and amount",
    );
  }
  return { order, payment };
}

export type CashfreeWebhookMetadata = Readonly<{
  idempotencyKey: string;
  version: typeof cashfreeWebhookVersion;
}>;

export function parseCashfreeWebhookMetadata(input: Readonly<{
  idempotencyKey: string;
  version: string;
}>): CashfreeWebhookMetadata {
  if (input.version !== cashfreeWebhookVersion) {
    throw new Error("Unsupported Cashfree webhook version");
  }
  const idempotencyKey = input.idempotencyKey.trim();
  if (
    !idempotencyKey ||
    idempotencyKey.length > 512 ||
    /[\u0000-\u001f\u007f]/.test(idempotencyKey)
  ) {
    throw new Error("Invalid Cashfree webhook idempotency key");
  }
  return { idempotencyKey, version: cashfreeWebhookVersion };
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

export async function getCashfreeRefund(
  orderId: string,
  refundId: string,
  dependencies: Readonly<{
    configuration?: CashfreeConfiguration;
    fetchImplementation?: typeof fetch;
  }> = {},
): Promise<CashfreeRefund> {
  if (!orderId || !refundId) throw new Error("Cashfree order and refund IDs are required");
  const configuration = dependencies.configuration ?? resolveCashfreeConfiguration();
  const payload = await cashfreeRequest(
    `/orders/${encodeURIComponent(orderId)}/refunds/${encodeURIComponent(refundId)}`,
    { method: "GET" },
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
