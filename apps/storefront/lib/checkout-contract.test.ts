import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("authenticated UPI checkout contract", () => {
  it("derives customer identity on the server and accepts no client payment method or email", async () => {
    const [route, form, checkout] = await Promise.all([
      readFile(new URL("../app/api/checkout/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../components/checkout-form.tsx", import.meta.url), "utf8"),
      readFile(new URL("./checkout.ts", import.meta.url), "utf8"),
    ]);
    assert.match(route, /getSession/);
    assert.match(route, /session\.user\.id/);
    assert.match(route, /session\.user\.email/);
    assert.doesNotMatch(form, /formData\.get\("email"\)/);
    assert.doesNotMatch(form, /paymentMethod/);
    assert.doesNotMatch(checkout, /provider:\s*"cod"/);
    assert.match(checkout, /CASHFREE_PAYMENT_TTL_MINUTES/);
    assert.match(checkout, /requestPayloadDigest/);
    assert.match(checkout, /bindCreatedCashfreePaymentAttempt/);
    assert.match(checkout, /recoverCashfreePaymentBinding/);
    assert.doesNotMatch(checkout, /transaction\.update\(paymentAttempts\)\.set\(\{[\s\S]*?providerOrderId/);
  });
});
