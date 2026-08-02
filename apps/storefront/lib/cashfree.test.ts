import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import {
  amountMinorToCashfreeMajor,
  cashfreeMajorToAmountMinor,
  createCashfreeRefund,
  verifyCashfreeOrderPaid,
  verifyCashfreeWebhookSignature,
} from "./cashfree";

describe("Cashfree money conversion", () => {
  it("uses integer paise internally and two-decimal major units on the wire", () => {
    assert.equal(amountMinorToCashfreeMajor(60_000), 600);
    assert.equal(amountMinorToCashfreeMajor(60_001), 600.01);
    assert.equal(cashfreeMajorToAmountMinor(600.01), 60_001);
  });
});

describe("verifyCashfreeWebhookSignature", () => {
  it("verifies the timestamp concatenated with the exact raw body", () => {
    const timestamp = "1785621000000";
    const rawBody = '{"type":"PAYMENT_SUCCESS_WEBHOOK"}';
    const secret = "test-secret";
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}${rawBody}`)
      .digest("base64");
    assert.equal(
      verifyCashfreeWebhookSignature({
        rawBody,
        signature,
        timestamp,
        secret,
        now: Number(timestamp),
      }),
      true,
    );
    assert.equal(
      verifyCashfreeWebhookSignature({
        rawBody: `${rawBody}\n`,
        signature,
        timestamp,
        secret,
        now: Number(timestamp),
      }),
      false,
    );
  });

  it("rejects stale signatures", () => {
    const timestamp = "1785621000000";
    const signature = createHmac("sha256", "secret")
      .update(`${timestamp}{}`)
      .digest("base64");
    assert.equal(
      verifyCashfreeWebhookSignature({
        rawBody: "{}",
        signature,
        timestamp,
        secret: "secret",
        now: Number(timestamp) + 300_001,
      }),
      false,
    );
  });
});

describe("verifyCashfreeOrderPaid", () => {
  it("accepts only a server-fetched PAID INR order with the expected amount", async () => {
    const fetchImplementation = async () =>
      new Response(
        JSON.stringify({
          cf_order_id: "cf-1",
          order_id: "PA-1",
          order_currency: "INR",
          order_amount: 600,
          order_status: "PAID",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    const order = await verifyCashfreeOrderPaid("PA-1", 60_000, {
      configuration: {
        baseUrl: "https://sandbox.cashfree.com/pg",
        clientId: "client",
        clientSecret: "secret",
      },
      fetchImplementation: fetchImplementation as typeof fetch,
    });
    assert.equal(order.order_status, "PAID");
  });
});

describe("createCashfreeRefund", () => {
  it("sends integer paise as INR major units with idempotency", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const refund = await createCashfreeRefund(
      {
        orderId: "PA-20260802-ABCD1234",
        refundId: "refund-1",
        amountMinor: 12_345,
        note: "Approved return",
        idempotencyKey: "9c3408af-2fe8-4ec6-8e19-ad672aba28ef",
      },
      {
        configuration: {
          baseUrl: "https://sandbox.cashfree.com/pg",
          clientId: "client",
          clientSecret: "secret",
        },
        fetchImplementation: (async (
          url: string | URL | Request,
          init?: RequestInit,
        ) => {
          capturedUrl = String(url);
          capturedInit = init;
          return new Response(
            JSON.stringify({
              cf_payment_id: "pay-1",
              cf_refund_id: "cf-refund-1",
              refund_id: "refund-1",
              order_id: "PA-20260802-ABCD1234",
              entity: "refund",
              refund_amount: 123.45,
              refund_currency: "INR",
              refund_note: "Approved return",
              refund_status: "PENDING",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }) as typeof fetch,
      },
    );
    assert.equal(
      capturedUrl,
      "https://sandbox.cashfree.com/pg/orders/PA-20260802-ABCD1234/refunds",
    );
    assert.equal(
      (capturedInit?.headers as Record<string, string>)["x-idempotency-key"],
      "9c3408af-2fe8-4ec6-8e19-ad672aba28ef",
    );
    assert.match(String(capturedInit?.body), /"refund_amount":123\.45/);
    assert.equal(refund.refund_status, "PENDING");
  });
});
