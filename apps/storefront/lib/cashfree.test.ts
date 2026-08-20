import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import {
  amountMinorToCashfreeMajor,
  cashfreeMajorToAmountMinor,
  createCashfreeOrder,
  createCashfreeRefund,
  parseCashfreeWebhookMetadata,
  verifyCashfreeOrderPaid,
  verifyCashfreePaymentSucceeded,
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

  it("rejects a paid response for a different provider order", async () => {
    await assert.rejects(
      verifyCashfreeOrderPaid("PA-1", 60_000, {
        configuration: {
          baseUrl: "https://sandbox.cashfree.com/pg",
          clientId: "client",
          clientSecret: "secret",
        },
        fetchImplementation: (async () => new Response(JSON.stringify({
          cf_order_id: "cf-2",
          order_id: "PA-OTHER",
          order_currency: "INR",
          order_amount: 600,
          order_status: "PAID",
        }), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch,
      }),
      /not server-verified/,
    );
  });
});

describe("createCashfreeOrder", () => {
  it("creates a UPI-only order with a 15-minute expiry and v2026 idempotency", async () => {
    let capturedInit: RequestInit | undefined;
    await createCashfreeOrder(
      {
        orderId: "PA-20260820-ABCD1234",
        amountMinor: 60_000,
        idempotencyKey: "9c3408af-2fe8-4ec6-8e19-ad672aba28ef",
        customer: {
          id: "customer-1",
          name: "Test Customer",
          email: "customer@example.com",
          phone: "9999999999",
        },
        returnUrl: "https://perfumeaura.com/order/token",
        notifyUrl: "https://perfumeaura.com/api/payments/cashfree/webhook",
      },
      {
        now: new Date("2026-08-20T10:00:00.000Z"),
        configuration: {
          baseUrl: "https://sandbox.cashfree.com/pg",
          clientId: "client",
          clientSecret: "secret",
        },
        fetchImplementation: (async (
          _url: string | URL | Request,
          init?: RequestInit,
        ) => {
          capturedInit = init;
          return new Response(
            JSON.stringify({
              cf_order_id: "cf-1",
              order_id: "PA-20260820-ABCD1234",
              order_currency: "INR",
              order_amount: 600,
              order_status: "ACTIVE",
              payment_session_id: "session-1",
              order_expiry_time: "2026-08-20T10:15:00.000Z",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }) as typeof fetch,
      },
    );
    const headers = capturedInit?.headers as Record<string, string>;
    const body = JSON.parse(String(capturedInit?.body)) as {
      order_expiry_time: string;
      order_meta: { payment_methods: string };
    };
    assert.equal(headers["x-api-version"], "2026-01-01");
    assert.equal(
      headers["x-idempotency-key"],
      "9c3408af-2fe8-4ec6-8e19-ad672aba28ef",
    );
    assert.equal(body.order_meta.payment_methods, "upi");
    assert.equal(body.order_expiry_time, "2026-08-20T10:15:00.000Z");
  });

  it("rejects a created order that does not match the local request", async () => {
    await assert.rejects(
      createCashfreeOrder(
        {
          orderId: "PA-EXPECTED",
          amountMinor: 60_000,
          idempotencyKey: "9c3408af-2fe8-4ec6-8e19-ad672aba28ef",
          customer: {
            id: "customer-1",
            name: "Test Customer",
            email: "customer@example.com",
            phone: "9999999999",
          },
          returnUrl: "https://perfumeaura.com/account/orders/PA-EXPECTED",
          notifyUrl: "https://perfumeaura.com/api/payments/cashfree/webhook",
        },
        {
          configuration: {
            baseUrl: "https://sandbox.cashfree.com/pg",
            clientId: "client",
            clientSecret: "secret",
          },
          fetchImplementation: (async () => new Response(JSON.stringify({
            cf_order_id: "cf-1",
            order_id: "PA-DIFFERENT",
            order_currency: "INR",
            order_amount: 600,
            order_status: "ACTIVE",
            payment_session_id: "session-1",
          }), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch,
        },
      ),
      /does not match/,
    );
  });
});

describe("verifyCashfreePaymentSucceeded", () => {
  it("requires the exact captured UPI payment and paid order", async () => {
    const requestedUrls: string[] = [];
    const result = await verifyCashfreePaymentSucceeded(
      {
        orderId: "PA-1",
        paymentId: "1453002795",
        expectedAmountMinor: 60_000,
      },
      {
        configuration: {
          baseUrl: "https://sandbox.cashfree.com/pg",
          clientId: "client",
          clientSecret: "secret",
        },
        fetchImplementation: (async (url: string | URL | Request) => {
          const requestedUrl = String(url);
          requestedUrls.push(requestedUrl);
          const payload = requestedUrl.endsWith("/payments/1453002795")
            ? {
                cf_payment_id: "1453002795",
                order_id: "PA-1",
                entity: "payment",
                is_captured: true,
                order_amount: 600,
                order_currency: "INR",
                payment_group: "upi",
                payment_amount: 600,
                payment_currency: "INR",
                payment_status: "SUCCESS",
              }
            : {
                cf_order_id: "cf-1",
                order_id: "PA-1",
                order_currency: "INR",
                order_amount: 600,
                order_status: "PAID",
              };
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }) as typeof fetch,
      },
    );
    assert.equal(result.payment.cf_payment_id, "1453002795");
    assert.deepEqual(requestedUrls.sort(), [
      "https://sandbox.cashfree.com/pg/orders/PA-1",
      "https://sandbox.cashfree.com/pg/orders/PA-1/payments/1453002795",
    ]);
  });

  it("rejects a different provider payment ID", async () => {
    await assert.rejects(
      verifyCashfreePaymentSucceeded(
        {
          orderId: "PA-1",
          paymentId: "1453002795",
          expectedAmountMinor: 60_000,
        },
        {
          configuration: {
            baseUrl: "https://sandbox.cashfree.com/pg",
            clientId: "client",
            clientSecret: "secret",
          },
          fetchImplementation: (async (url: string | URL | Request) =>
            new Response(
              JSON.stringify(
                String(url).includes("/payments/")
                  ? {
                      cf_payment_id: "different-payment",
                      order_id: "PA-1",
                      entity: "payment",
                      is_captured: true,
                      order_amount: 600,
                      order_currency: "INR",
                      payment_group: "upi",
                      payment_amount: 600,
                      payment_currency: "INR",
                      payment_status: "SUCCESS",
                    }
                  : {
                      cf_order_id: "cf-1",
                      order_id: "PA-1",
                      order_currency: "INR",
                      order_amount: 600,
                      order_status: "PAID",
                    },
              ),
              { status: 200, headers: { "Content-Type": "application/json" } },
            )) as typeof fetch,
        },
      ),
      /not server-verified/,
    );
  });

  it("rejects a non-UPI payment group", async () => {
    await assert.rejects(
      verifyCashfreePaymentSucceeded(
        {
          orderId: "PA-1",
          paymentId: "1453002795",
          expectedAmountMinor: 60_000,
        },
        {
          configuration: {
            baseUrl: "https://sandbox.cashfree.com/pg",
            clientId: "client",
            clientSecret: "secret",
          },
          fetchImplementation: (async (url: string | URL | Request) =>
            new Response(
              JSON.stringify(
                String(url).includes("/payments/")
                  ? {
                      cf_payment_id: "1453002795",
                      order_id: "PA-1",
                      entity: "payment",
                      is_captured: true,
                      order_amount: 600,
                      order_currency: "INR",
                      payment_group: "wallet",
                      payment_amount: 600,
                      payment_currency: "INR",
                      payment_status: "SUCCESS",
                    }
                  : {
                      cf_order_id: "cf-1",
                      order_id: "PA-1",
                      order_currency: "INR",
                      order_amount: 600,
                      order_status: "PAID",
                    },
              ),
              { status: 200, headers: { "Content-Type": "application/json" } },
            )) as typeof fetch,
        },
      ),
      /captured UPI success/,
    );
  });
});

describe("parseCashfreeWebhookMetadata", () => {
  it("accepts the documented payment webhook version and opaque idempotency key", () => {
    assert.deepEqual(
      parseCashfreeWebhookMetadata({
        idempotencyKey: "n9rn7079wqXcse3GEDEXCYle9ajXmU0SUQY8zrUNAlc=",
        version: "2025-01-01",
      }),
      {
        idempotencyKey: "n9rn7079wqXcse3GEDEXCYle9ajXmU0SUQY8zrUNAlc=",
        version: "2025-01-01",
      },
    );
  });

  it("rejects missing idempotency and unsupported webhook versions", () => {
    assert.throws(
      () =>
        parseCashfreeWebhookMetadata({
          idempotencyKey: "",
          version: "2025-01-01",
        }),
      /idempotency key/,
    );
    assert.throws(
      () =>
        parseCashfreeWebhookMetadata({
          idempotencyKey: "event-key",
          version: "2023-08-01",
        }),
      /Unsupported/,
    );
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
