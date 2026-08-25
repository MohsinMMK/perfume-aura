import { and, asc, eq, inArray } from "drizzle-orm";
import { businessDateAt, BUSINESS_TIMEZONE } from "./business-time";
import { allocateDocumentNumberInTransaction } from "./document-numbers";
import { DomainError } from "./domain-errors";
import { applyMovementInTransaction } from "./inventory";
import { availableQuantity } from "./inventory-math";
import {
  consumeOilInTransaction,
  oilDemandForVariant,
  type OilDemand,
} from "./oil-inventory";
import {
  customers,
  invoiceLines,
  invoices,
  opsSales,
  payments,
  products,
  productVariants,
} from "./schema";
import {
  isUniqueViolation,
  postgresConstraint,
  runDomainTransaction,
  type DbTransaction,
} from "./transactions";

export type SaleCustomerInput =
  | { customerId: string }
  | {
      name: string;
      email?: string | null;
      phone?: string | null;
      addressLine?: string | null;
      city?: string | null;
      notes?: string | null;
    };

export type SaleLineInput = {
  variantId: string;
  quantity: number;
  unitPriceCents?: number;
};

export type SalePaymentInput = {
  amountCents: number;
  method: "cash" | "bank_transfer" | "card" | "other";
  idempotencyKey: string;
  paidAt: Date;
  reference?: string | null;
  note?: string | null;
};

export type CompleteOpsSaleInput = {
  customer: SaleCustomerInput;
  lines: readonly SaleLineInput[];
  payment?: SalePaymentInput;
  notes?: string | null;
  createdBy?: string | null;
  idempotencyKey: string;
  now?: Date;
};

export type CompleteOpsSaleResult = {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  oilConsumedMl: number;
  totalCents: number;
  amountPaidCents: number;
  idempotent: boolean;
};

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

async function loadExistingSale(
  tx: DbTransaction,
  idempotencyKey: string,
): Promise<CompleteOpsSaleResult | null> {
  const [existing] = await tx
    .select({
      invoiceId: opsSales.invoiceId,
      customerId: opsSales.customerId,
      invoiceNumber: invoices.number,
      totalCents: invoices.totalCents,
      amountPaidCents: invoices.amountPaidCents,
    })
    .from(opsSales)
    .innerJoin(invoices, eq(invoices.id, opsSales.invoiceId))
    .where(eq(opsSales.idempotencyKey, idempotencyKey))
    .limit(1);
  if (!existing || !existing.invoiceNumber) return null;
  return {
    invoiceId: existing.invoiceId,
    invoiceNumber: existing.invoiceNumber,
    customerId: existing.customerId,
    oilConsumedMl: 0,
    totalCents: existing.totalCents,
    amountPaidCents: existing.amountPaidCents,
    idempotent: true,
  };
}

async function resolveCustomer(
  tx: DbTransaction,
  input: SaleCustomerInput,
): Promise<string> {
  if ("customerId" in input) {
    const [customer] = await tx
      .select({ id: customers.id, status: customers.status })
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .for("update")
      .limit(1);
    if (!customer || customer.status !== "active") {
      throw new DomainError("INVALID_STATE", "Select an active customer");
    }
    return customer.id;
  }

  const name = input.name.trim();
  if (!name) {
    throw new DomainError("INVALID_INPUT", "Customer name is required");
  }
  const [created] = await tx
    .insert(customers)
    .values({
      name,
      email: emptyToNull(input.email),
      phone: emptyToNull(input.phone),
      addressLine: emptyToNull(input.addressLine),
      city: emptyToNull(input.city),
      notes: emptyToNull(input.notes),
      status: "active",
    })
    .returning({ id: customers.id });
  if (!created) {
    throw new DomainError("CONFLICT", "Failed to create customer");
  }
  return created.id;
}

export async function completeOpsSale(
  input: CompleteOpsSaleInput,
): Promise<CompleteOpsSaleResult> {
  if (!input.idempotencyKey.trim()) {
    throw new DomainError("INVALID_INPUT", "Sale idempotency key is required");
  }
  if (!input.lines.length) {
    throw new DomainError("INVALID_INPUT", "Add at least one product");
  }

  try {
    return await runDomainTransaction(async (tx) => {
      const existing = await loadExistingSale(tx, input.idempotencyKey);
      if (existing) return existing;

      const customerId = await resolveCustomer(tx, input.customer);
      const variantIds = [
        ...new Set(input.lines.map((line) => line.variantId)),
      ].sort();
      if (variantIds.length !== input.lines.length) {
        throw new DomainError(
          "INVALID_INPUT",
          "Combine duplicate products into one line",
        );
      }

      const variantRows = await tx
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          sku: productVariants.sku,
          sizeMl: productVariants.sizeMl,
          retailCents: productVariants.retailCents,
          quantityOnHand: productVariants.quantityOnHand,
          qtyReserved: productVariants.qtyReserved,
          status: productVariants.status,
        })
        .from(productVariants)
        .where(inArray(productVariants.id, variantIds))
        .orderBy(asc(productVariants.id));
      if (variantRows.length !== variantIds.length) {
        throw new DomainError("NOT_FOUND", "One or more products were not found");
      }

      const productIds = [
        ...new Set(variantRows.map((variant) => variant.productId)),
      ].sort();
      const productRows = await tx
        .select({
          id: products.id,
          name: products.name,
          status: products.status,
        })
        .from(products)
        .where(inArray(products.id, productIds))
        .orderBy(asc(products.id))
        .for("update");
      if (productRows.length !== productIds.length) {
        throw new DomainError("NOT_FOUND", "One or more products were not found");
      }

      const lockedVariants = await tx
        .select()
        .from(productVariants)
        .where(inArray(productVariants.id, variantIds))
        .orderBy(asc(productVariants.id))
        .for("update");

      const variantsById = new Map(
        lockedVariants.map((variant) => [variant.id, variant]),
      );
      const productsById = new Map(
        productRows.map((product) => [product.id, product]),
      );

      const oilDemands: OilDemand[] = [];
      let subtotalCents = 0;
      const preparedLines: Array<{
        variantId: string;
        description: string;
        quantity: number;
        unitPriceCents: number;
        lineTotalCents: number;
      }> = [];

      for (const line of input.lines) {
        if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
          throw new DomainError("INVALID_INPUT", "Quantity must be a positive integer");
        }
        const variant = variantsById.get(line.variantId);
        if (!variant || variant.status !== "active") {
          throw new DomainError("INVALID_STATE", "Variant not found or inactive");
        }
        const product = productsById.get(variant.productId);
        if (!product || product.status !== "active") {
          throw new DomainError("INVALID_STATE", "Product not found or inactive");
        }
        const available = availableQuantity(
          variant.quantityOnHand,
          variant.qtyReserved,
        );
        if (line.quantity > available) {
          throw new DomainError(
            "INSUFFICIENT_STOCK",
            `Insufficient stock for ${variant.sku}: available ${available}, requested ${line.quantity}`,
          );
        }
        const unitPriceCents =
          line.unitPriceCents === undefined || line.unitPriceCents === 0
            ? variant.retailCents
            : line.unitPriceCents;
        if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
          throw new DomainError("INVALID_INPUT", "Invalid unit price");
        }
        const lineTotalCents = line.quantity * unitPriceCents;
        subtotalCents += lineTotalCents;
        preparedLines.push({
          variantId: variant.id,
          description: `${product.name} · ${variant.sizeMl}ml · ${variant.sku}`,
          quantity: line.quantity,
          unitPriceCents,
          lineTotalCents,
        });
        oilDemands.push(
          oilDemandForVariant({
            productId: variant.productId,
            sizeMl: variant.sizeMl,
            quantity: line.quantity,
          }),
        );
      }

      const now = input.now ?? new Date();
      const [invoice] = await tx
        .insert(invoices)
        .values({
          customerId,
          status: "draft",
          notes: emptyToNull(input.notes),
          createdBy: input.createdBy ?? null,
          subtotalCents,
          taxCents: 0,
          totalCents: subtotalCents,
        })
        .returning({ id: invoices.id });
      if (!invoice) {
        throw new DomainError("CONFLICT", "Failed to create invoice");
      }

      for (const [index, line] of preparedLines.entries()) {
        await tx.insert(invoiceLines).values({
          invoiceId: invoice.id,
          position: index,
          variantId: line.variantId,
          description: line.description,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          lineTotalCents: line.lineTotalCents,
          quantityFulfilled: 0,
        });
      }

      const number = await allocateDocumentNumberInTransaction(
        tx,
        "invoice",
        now,
      );
      const issueDate = businessDateAt(now, BUSINESS_TIMEZONE);
      const [issued] = await tx
        .update(invoices)
        .set({
          status: "issued",
          number,
          issueDate,
          issuedAt: now,
          subtotalCents,
          taxCents: 0,
          totalCents: subtotalCents,
          updatedAt: now,
        })
        .where(and(eq(invoices.id, invoice.id), eq(invoices.status, "draft")))
        .returning({ id: invoices.id });
      if (!issued) {
        throw new DomainError("CONFLICT", "Invoice state changed while issuing");
      }

      let amountPaidCents = 0;
      if (input.payment) {
        if (
          !Number.isInteger(input.payment.amountCents) ||
          input.payment.amountCents <= 0
        ) {
          throw new DomainError("INVALID_INPUT", "Payment amount must be positive");
        }
        if (input.payment.amountCents > subtotalCents) {
          throw new DomainError(
            "OVERPAYMENT",
            "Payment exceeds the sale total",
          );
        }
        const paymentNumber = await allocateDocumentNumberInTransaction(
          tx,
          "payment",
          input.payment.paidAt,
        );
        await tx.insert(payments).values({
          number: paymentNumber,
          invoiceId: invoice.id,
          customerId,
          method: input.payment.method,
          amountCents: input.payment.amountCents,
          paidAt: input.payment.paidAt,
          reference: emptyToNull(input.payment.reference),
          note: emptyToNull(input.payment.note),
          idempotencyKey: input.payment.idempotencyKey,
          createdBy: input.createdBy ?? null,
        });
        amountPaidCents = input.payment.amountCents;
        const fullyPaid = amountPaidCents === subtotalCents;
        await tx
          .update(invoices)
          .set({
            amountPaidCents,
            status: fullyPaid ? "paid" : "issued",
            paidAt: fullyPaid ? input.payment.paidAt : null,
            updatedAt: now,
          })
          .where(eq(invoices.id, invoice.id));
      }

      const insertedLines = await tx
        .select({
          id: invoiceLines.id,
          variantId: invoiceLines.variantId,
          quantity: invoiceLines.quantity,
        })
        .from(invoiceLines)
        .where(eq(invoiceLines.invoiceId, invoice.id))
        .orderBy(asc(invoiceLines.id));

      for (const line of insertedLines) {
        if (!line.variantId) {
          throw new DomainError("INVALID_STATE", "Sale lines must be stocked products");
        }
        await applyMovementInTransaction(tx, {
          variantId: line.variantId,
          type: "sale",
          quantity: line.quantity,
          note: `Fulfill invoice ${invoice.id.slice(0, 8)}`,
          userId: input.createdBy ?? undefined,
          refType: "invoice",
          refId: invoice.id,
          idempotencyKey: `fulfill:${invoice.id}:${line.id}:${line.quantity}`,
        });
        await tx
          .update(invoiceLines)
          .set({ quantityFulfilled: line.quantity })
          .where(eq(invoiceLines.id, line.id));
      }

      const oil = await consumeOilInTransaction(tx, {
        demands: oilDemands,
        refType: "invoice",
        refId: invoice.id,
        userId: input.createdBy ?? null,
        idempotencyPrefix: `oil:ops-sale:${input.idempotencyKey}`,
      });

      await tx.insert(opsSales).values({
        idempotencyKey: input.idempotencyKey,
        invoiceId: invoice.id,
        customerId,
        createdBy: input.createdBy ?? null,
      });

      return {
        invoiceId: invoice.id,
        invoiceNumber: number,
        customerId,
        oilConsumedMl: oil.consumedMl,
        totalCents: subtotalCents,
        amountPaidCents,
        idempotent: false,
      };
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    if (isUniqueViolation(error)) {
      const constraint = postgresConstraint(error);
      if (
        constraint === "ops_sales_idempotency_key_unique" ||
        constraint === "ops_sales_invoice_id_unique"
      ) {
        const replay = await runDomainTransaction((tx) =>
          loadExistingSale(tx, input.idempotencyKey),
        );
        if (replay) return replay;
      }
    }
    throw error;
  }
}
