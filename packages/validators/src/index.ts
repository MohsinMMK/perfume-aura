import { z } from "zod";

/**
 * Variant money as major PKR units in forms (rupees), converted to cents server-side.
 */
export const variantFormSchema = z.object({
  sku: z
    .string()
    .min(1, "SKU is required")
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/, "SKU: letters, numbers, . _ - only"),
  barcode: z.string().max(64).optional(),
  sizeMl: z.number().int().positive("Size (ml) must be positive"),
  /** Major units (rupees), e.g. 4500.5 */
  cost: z.number().min(0, "Cost cannot be negative"),
  /** Major units (rupees) */
  retail: z.number().min(0, "Retail cannot be negative"),
  reorderLevel: z.number().int().min(0).default(0),
});

/** Create product with optional first variant (client sends parsed numbers). */
export const createProductSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    brand: z.string().max(200).optional(),
    category: z.string().max(100).optional(),
    description: z.string().max(5000).optional(),
    withVariant: z.boolean().optional().default(true),
    sku: z.string().max(64).optional(),
    barcode: z.string().max(64).optional(),
    sizeMl: z.number().int().positive().optional(),
    cost: z.number().min(0).optional(),
    retail: z.number().min(0).optional(),
    reorderLevel: z.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.withVariant === false) return;

    if (!data.sku || data.sku.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SKU is required for the first variant",
        path: ["sku"],
      });
    } else if (!/^[A-Za-z0-9._-]+$/.test(data.sku)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SKU: letters, numbers, . _ - only",
        path: ["sku"],
      });
    }

    if (data.sizeMl === undefined || data.sizeMl <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Size (ml) is required",
        path: ["sizeMl"],
      });
    }
    if (data.cost === undefined || data.cost < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cost is required",
        path: ["cost"],
      });
    }
    if (data.retail === undefined || data.retail < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Retail is required",
        path: ["retail"],
      });
    }
  });

export const createVariantSchema = variantFormSchema.extend({
  productId: z.string().uuid(),
});

export const archiveProductSchema = z.object({
  productId: z.string().uuid(),
});

export const receiveStockSchema = z.object({
  variantId: z.string().uuid("Select a variant"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  note: z.string().max(1000).optional(),
});

export const adjustStockSchema = z.object({
  variantId: z.string().uuid("Select a variant"),
  /** Signed delta: positive adds, negative removes. */
  quantityDelta: z
    .number()
    .int("Must be a whole number")
    .refine((n) => n !== 0, "Delta cannot be zero"),
  note: z.string().min(1, "Note is required for adjustments").max(1000),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

/* ─── Phase 2: customers & invoices ─── */

export const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z
    .string()
    .email("Invalid email")
    .max(200)
    .optional()
    .or(z.literal("")),
  phone: z.string().max(40).optional(),
  addressLine: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateCustomerSchema = customerFormSchema.extend({
  customerId: z.string().uuid(),
});

export const archiveCustomerSchema = z.object({
  customerId: z.string().uuid(),
});

export const createInvoiceDraftSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  notes: z.string().max(5000).optional(),
});

export const invoiceLineSchema = z.object({
  invoiceId: z.string().uuid(),
  variantId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().min(1, "Description is required").max(500),
  quantity: z.number().int().positive("Quantity must be positive"),
  /** Major PKR (rupees) */
  unitPrice: z.number().min(0, "Price cannot be negative"),
});

export const removeInvoiceLineSchema = z.object({
  lineId: z.string().uuid(),
  invoiceId: z.string().uuid(),
});

export const invoiceIdSchema = z.object({
  invoiceId: z.string().uuid(),
});

export const fulfillInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  /** If empty, fulfill all remaining variant lines. */
  lineIds: z.array(z.string().uuid()).optional(),
});

export type CustomerFormInput = z.infer<typeof customerFormSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateInvoiceDraftInput = z.infer<typeof createInvoiceDraftSchema>;
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;
export type FulfillInvoiceInput = z.infer<typeof fulfillInvoiceSchema>;
