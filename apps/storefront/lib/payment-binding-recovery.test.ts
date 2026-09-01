import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CashfreeRequestError } from "./cashfree";
import {
  CashfreeOrderIdentityError,
  recoverCashfreePaymentBinding,
} from "./payment-binding-recovery";

const input = {
  paymentAttemptId: "3fe26306-b45a-4a2f-9875-004fa3ee3b5e",
  createdOrderNumber: "PA-20260831-000001",
  expectedAmountMinor: 12_345,
  boundAt: new Date("2026-08-31T12:00:00.000Z"),
} as const;

function providerOrder(overrides: Record<string, unknown> = {}) {
  return {
    cf_order_id: "10001",
    order_id: input.createdOrderNumber,
    order_currency: "INR" as const,
    order_amount: 123.45,
    order_status: "ACTIVE" as const,
    payment_session_id: "session-10001",
    ...overrides,
  };
}

describe("Cashfree payment binding recovery", () => {
  it("rebinds an accepted order using the durable merchant order number", async () => {
    const bindings: unknown[] = [];
    const result = await recoverCashfreePaymentBinding(input, {
      getOrder: async (orderId) => {
        assert.equal(orderId, input.createdOrderNumber);
        return providerOrder();
      },
      bindAttempt: async (binding) => {
        bindings.push(binding);
        return {
          orderId: "20c35d4f-2a0a-4a10-bacd-bc4e4a3adf1d",
          checkoutSessionId: "71f74980-cd32-45ab-b853-fc3935f0c05e",
          idempotent: false,
        };
      },
    });

    assert.deepEqual(result, {
      kind: "bound",
      providerOrderId: input.createdOrderNumber,
      providerSessionId: "session-10001",
      providerStatus: "ACTIVE",
    });
    assert.deepEqual(bindings, [{
      paymentAttemptId: input.paymentAttemptId,
      providerOrderId: input.createdOrderNumber,
      providerSessionId: "session-10001",
      boundAt: input.boundAt,
    }]);
  });

  it("does not bind a terminal provider order", async () => {
    let bindCalled = false;
    const result = await recoverCashfreePaymentBinding(input, {
      getOrder: async () => providerOrder({
        order_status: "EXPIRED" as const,
        payment_session_id: undefined,
      }),
      bindAttempt: async () => {
        bindCalled = true;
        throw new Error("must not bind");
      },
    });

    assert.deepEqual(result, { kind: "terminal", providerStatus: "EXPIRED" });
    assert.equal(bindCalled, false);
  });

  it("treats Cashfree's documented not-found response as an absent order", async () => {
    let bindCalled = false;
    const result = await recoverCashfreePaymentBinding(input, {
      getOrder: async () => {
        throw new CashfreeRequestError(404);
      },
      bindAttempt: async () => {
        bindCalled = true;
        throw new Error("must not bind");
      },
    });

    assert.deepEqual(result, { kind: "absent" });
    assert.equal(bindCalled, false);
  });

  it("retains a nonterminal order until a payment session is available", async () => {
    let bindCalled = false;
    const result = await recoverCashfreePaymentBinding(input, {
      getOrder: async () => providerOrder({ payment_session_id: undefined }),
      bindAttempt: async () => {
        bindCalled = true;
        throw new Error("must not bind");
      },
    });

    assert.deepEqual(result, { kind: "pending", providerStatus: "ACTIVE" });
    assert.equal(bindCalled, false);
  });

  it("rejects a provider response with a different identity or amount", async () => {
    await assert.rejects(
      recoverCashfreePaymentBinding(input, {
        getOrder: async () => providerOrder({ order_id: "wrong-order" }),
        bindAttempt: async () => {
          throw new Error("must not bind");
        },
      }),
      CashfreeOrderIdentityError,
    );
    await assert.rejects(
      recoverCashfreePaymentBinding(input, {
        getOrder: async () => providerOrder({ order_amount: 123.44 }),
        bindAttempt: async () => {
          throw new Error("must not bind");
        },
      }),
      CashfreeOrderIdentityError,
    );
  });
});
