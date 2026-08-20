import { z } from "zod";

const responseSchema = z.object({
  cf_refund_id: z.union([z.string(), z.number()]).transform(String),
  refund_status: z.enum(["SUCCESS", "PENDING", "CANCELLED", "ONHOLD", "FAILED"]),
  refund_arn: z.string().nullish(),
});

export async function requestCashfreeRefund(input: Readonly<{
  providerOrderId: string;
  refundId: string;
  idempotencyKey: string;
  amountMinor: number;
  reason: string;
}>): Promise<z.infer<typeof responseSchema>> {
  const mode = process.env.CASHFREE_ENV;
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  if ((mode !== "sandbox" && mode !== "production") || !clientId || !clientSecret) {
    throw new Error("Cashfree refund configuration is unavailable");
  }
  const baseUrl = mode === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
  const response = await fetch(`${baseUrl}/orders/${encodeURIComponent(input.providerOrderId)}/refunds`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": "2026-01-01",
      "x-client-id": clientId,
      "x-client-secret": clientSecret,
      "x-idempotency-key": input.idempotencyKey,
      "x-request-id": input.idempotencyKey,
    },
    body: JSON.stringify({
      refund_amount: Number((input.amountMinor / 100).toFixed(2)),
      refund_id: input.refundId,
      refund_note: input.reason,
      refund_speed: "STANDARD",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(`Cashfree refund request failed with status ${response.status}`);
  return responseSchema.parse(Array.isArray(payload) ? payload[0] : payload);
}
