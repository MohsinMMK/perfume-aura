import { and, eq, ne } from "drizzle-orm";
import { DomainError } from "./domain-errors";
import { commerceOrders, invoices } from "./schema";
import { runDomainTransaction } from "./transactions";

export const commerceInvoiceTransitions = [
  "prepaid_paid",
  "cod_reconciled",
] as const;

export type CommerceInvoiceTransition =
  (typeof commerceInvoiceTransitions)[number];

export type LinkCommerceOrderInvoiceInput = Readonly<{
  orderId: string;
  invoiceId: string;
  transition: CommerceInvoiceTransition;
}>;

/**
 * Link an owner-created financial invoice to a commerce order only at an
 * approved settlement transition. Checkout never creates financial invoices.
 *
 * The derived transition key makes retries idempotent while exact total and
 * currency checks prevent a valid invoice from being attached to the wrong
 * order.
 */
export async function linkCommerceOrderInvoice(
  input: LinkCommerceOrderInvoiceInput,
): Promise<Readonly<{ orderId: string; invoiceId: string; idempotent: boolean }>> {
  if (!input.orderId || !input.invoiceId) {
    throw new DomainError("INVALID_INPUT", "Order and invoice are required");
  }
  if (!commerceInvoiceTransitions.includes(input.transition)) {
    throw new DomainError("INVALID_INPUT", "Unsupported invoice transition");
  }

  return runDomainTransaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(commerceOrders)
      .where(eq(commerceOrders.id, input.orderId))
      .for("update")
      .limit(1);

    if (!order) throw new DomainError("NOT_FOUND", "Commerce order not found");

    const transitionKey = `${input.transition}:${order.id}`;
    if (order.invoiceId || order.invoiceTransitionKey) {
      if (
        order.invoiceId === input.invoiceId &&
        order.invoiceTransitionKey === transitionKey
      ) {
        return {
          orderId: order.id,
          invoiceId: input.invoiceId,
          idempotent: true,
        };
      }
      throw new DomainError(
        "IDEMPOTENCY_CONFLICT",
        "Order is already linked through a different invoice transition",
      );
    }

    const eligible =
      input.transition === "prepaid_paid"
        ? order.paymentState === "paid" &&
          !["cancelled", "returned"].includes(order.status)
        : order.paymentState === "paid" && order.status === "delivered";
    if (!eligible) {
      throw new DomainError(
        "INVALID_STATE",
        "Order has not reached the approved invoice transition",
      );
    }

    const [invoice] = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.id, input.invoiceId))
      .for("update")
      .limit(1);
    if (!invoice) throw new DomainError("NOT_FOUND", "Invoice not found");
    if (invoice.status !== "issued" && invoice.status !== "paid") {
      throw new DomainError(
        "INVALID_STATE",
        "Only issued or paid invoices can be linked to commerce orders",
      );
    }
    if (invoice.currency !== "INR" || invoice.totalCents !== order.totalAmountMinor) {
      throw new DomainError(
        "INVALID_STATE",
        "Invoice currency and total must exactly match the commerce order",
      );
    }

    const [conflictingOrder] = await tx
      .select({ id: commerceOrders.id })
      .from(commerceOrders)
      .where(
        and(
          eq(commerceOrders.invoiceId, input.invoiceId),
          ne(commerceOrders.id, input.orderId),
        ),
      )
      .limit(1);
    if (conflictingOrder) {
      throw new DomainError("CONFLICT", "Invoice is linked to another order");
    }

    await tx
      .update(commerceOrders)
      .set({
        invoiceId: input.invoiceId,
        invoiceTransitionKey: transitionKey,
        updatedAt: new Date(),
      })
      .where(eq(commerceOrders.id, input.orderId));

    return {
      orderId: order.id,
      invoiceId: input.invoiceId,
      idempotent: false,
    };
  });
}
