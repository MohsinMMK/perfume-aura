import {
  cashfreeMajorToAmountMinor,
  CashfreeRequestError,
  getCashfreeOrder,
  type CashfreeOrder,
} from "./cashfree";
import { bindCreatedCashfreePaymentAttempt } from "./payment-finalizer-client";

type PaymentBindingRecoveryDependencies = Readonly<{
  getOrder: (orderId: string) => Promise<CashfreeOrder>;
  bindAttempt: typeof bindCreatedCashfreePaymentAttempt;
}>;

export class CashfreeOrderIdentityError extends Error {
  constructor() {
    super("Cashfree order identity does not match the created checkout");
    this.name = "CashfreeOrderIdentityError";
  }
}

export type PaymentBindingRecoveryResult =
  | Readonly<{
    kind: "bound";
    providerOrderId: string;
    providerSessionId: string;
    providerStatus: "ACTIVE" | "PAID";
  }>
  | Readonly<{
    kind: "terminal";
    providerStatus: "EXPIRED" | "TERMINATED";
  }>
  | Readonly<{
    kind: "absent";
  }>
  | Readonly<{
    kind: "pending";
    providerStatus: "ACTIVE" | "PAID" | "TERMINATION_REQUESTED";
  }>;

/**
 * Recover a Cashfree order that may have been accepted before the local
 * payment-attempt binding failed. The merchant order number is the durable
 * idempotency identity; no provider response is trusted until its identity,
 * currency, and amount match the server-owned checkout.
 */
export async function recoverCashfreePaymentBinding(
  input: Readonly<{
    paymentAttemptId: string;
    createdOrderNumber: string;
    expectedAmountMinor: number;
    boundAt: Date;
  }>,
  dependencies: PaymentBindingRecoveryDependencies = {
    getOrder: getCashfreeOrder,
    bindAttempt: bindCreatedCashfreePaymentAttempt,
  },
): Promise<PaymentBindingRecoveryResult> {
  let providerOrder: CashfreeOrder;
  try {
    providerOrder = await dependencies.getOrder(input.createdOrderNumber);
  } catch (error) {
    if (error instanceof CashfreeRequestError && error.status === 404) {
      return { kind: "absent" };
    }
    throw error;
  }
  if (
    providerOrder.order_id !== input.createdOrderNumber ||
    providerOrder.order_currency !== "INR" ||
    cashfreeMajorToAmountMinor(providerOrder.order_amount) !== input.expectedAmountMinor
  ) {
    throw new CashfreeOrderIdentityError();
  }

  if (
    providerOrder.order_status === "EXPIRED" ||
    providerOrder.order_status === "TERMINATED"
  ) {
    return {
      kind: "terminal",
      providerStatus: providerOrder.order_status,
    };
  }

  if (
    providerOrder.order_status === "TERMINATION_REQUESTED" ||
    !providerOrder.payment_session_id
  ) {
    return {
      kind: "pending",
      providerStatus: providerOrder.order_status,
    };
  }

  await dependencies.bindAttempt({
    paymentAttemptId: input.paymentAttemptId,
    providerOrderId: providerOrder.order_id,
    providerSessionId: providerOrder.payment_session_id,
    boundAt: input.boundAt,
  });
  return {
    kind: "bound",
    providerOrderId: providerOrder.order_id,
    providerSessionId: providerOrder.payment_session_id,
    providerStatus: providerOrder.order_status,
  };
}
