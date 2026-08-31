import { and, eq, sql } from "drizzle-orm";
import { DomainError } from "./domain-errors";
import { applyMovementInTransaction } from "./inventory";
import { invoiceLines, invoices, stockMovements } from "./schema";
import { runDomainTransaction } from "./transactions";

export type ReceiveInvoiceLineReturnInput = {
  invoiceId: string;
  lineId: string;
  quantity: number;
  reason: string;
  idempotencyKey: string;
  userId?: string | null;
};

export type ReceiveInvoiceLineReturnResult = {
  invoiceId: string;
  lineId: string;
  quantityReturned: number;
  quantityAfter: number;
  idempotent: boolean;
};

/**
 * Returns a fulfilled finished bottle to stock. Perfume oil is deliberately
 * not restored: a sold/opened bottle cannot be poured back into its source lot.
 * Financial refunds remain a separate, provider/accounting-controlled action.
 */
export async function receiveInvoiceLineReturn(
  input: ReceiveInvoiceLineReturnInput,
): Promise<ReceiveInvoiceLineReturnResult> {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new DomainError("INVALID_INPUT", "Return quantity must be a positive integer");
  }
  const reason = input.reason.trim();
  if (!reason) {
    throw new DomainError("INVALID_INPUT", "Return reason is required");
  }

  return runDomainTransaction(async (tx) => {
    const [line] = await tx
      .select({
        id: invoiceLines.id,
        invoiceId: invoiceLines.invoiceId,
        variantId: invoiceLines.variantId,
        description: invoiceLines.description,
        quantityFulfilled: invoiceLines.quantityFulfilled,
        invoiceNumber: invoices.number,
        invoiceStatus: invoices.status,
      })
      .from(invoiceLines)
      .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
      .where(
        and(
          eq(invoiceLines.id, input.lineId),
          eq(invoiceLines.invoiceId, input.invoiceId),
        ),
      )
      .for("update")
      .limit(1);

    if (!line || !line.variantId) {
      throw new DomainError("NOT_FOUND", "Invoice product line not found");
    }
    if (line.invoiceStatus !== "issued" && line.invoiceStatus !== "paid") {
      throw new DomainError("INVALID_STATE", "Only issued or paid invoices can receive returns");
    }

    const movementNote = `${line.invoiceNumber ?? "Invoice"} · ${line.description} · ${reason}`;
    const [existingMovement] = await tx
      .select({
        type: stockMovements.type,
        variantId: stockMovements.variantId,
        quantityDelta: stockMovements.quantityDelta,
        quantityAfter: stockMovements.quantityAfter,
        refType: stockMovements.refType,
        refId: stockMovements.refId,
        note: stockMovements.note,
      })
      .from(stockMovements)
      .where(eq(stockMovements.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existingMovement) {
      if (
        existingMovement.type !== "return" ||
        existingMovement.variantId !== line.variantId ||
        existingMovement.quantityDelta !== input.quantity ||
        existingMovement.refType !== "invoice_line_return" ||
        existingMovement.refId !== line.id ||
        existingMovement.note !== movementNote
      ) {
        throw new DomainError(
          "IDEMPOTENCY_CONFLICT",
          "Return request key was already used for a different change",
        );
      }
      return {
        invoiceId: line.invoiceId,
        lineId: line.id,
        quantityReturned: input.quantity,
        quantityAfter: existingMovement.quantityAfter,
        idempotent: true,
      };
    }

    const [returned] = await tx
      .select({
        quantity: sql<number>`coalesce(sum(${stockMovements.quantityDelta}), 0)::int`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.type, "return"),
          eq(stockMovements.refType, "invoice_line_return"),
          eq(stockMovements.refId, line.id),
        ),
      );
    const alreadyReturned = Number(returned?.quantity ?? 0);
    const returnable = Math.max(0, line.quantityFulfilled - alreadyReturned);
    if (input.quantity > returnable) {
      throw new DomainError(
        "INVALID_INPUT",
        `Only ${returnable} fulfilled bottle${returnable === 1 ? " is" : "s are"} available to return`,
      );
    }

    const movement = await applyMovementInTransaction(tx, {
      variantId: line.variantId,
      type: "return",
      quantity: input.quantity,
      note: movementNote,
      userId: input.userId ?? undefined,
      idempotencyKey: input.idempotencyKey,
      refType: "invoice_line_return",
      refId: line.id,
    });

    return {
      invoiceId: line.invoiceId,
      lineId: line.id,
      quantityReturned: input.quantity,
      quantityAfter: movement.quantityAfter,
      idempotent: movement.idempotent,
    };
  });
}
