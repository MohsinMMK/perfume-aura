import { eq } from "drizzle-orm";
import { DomainError } from "./domain-errors";
import { products, productVariants } from "./schema";
import {
  isUniqueViolation,
  postgresConstraint,
  runDomainTransaction,
} from "./transactions";

type InitialVariantInput = {
  sku: string;
  barcode?: string | null;
  sizeMl: number;
  costCents: number;
  retailCents: number;
  reorderLevel: number;
};

export type CreateProductWithInitialVariantInput = {
  name: string;
  slug: string;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  initialVariant?: InitialVariantInput;
};

function mapProductConstraint(error: unknown): never {
  if (!isUniqueViolation(error)) throw error;

  const constraint = postgresConstraint(error);
  if (constraint === "product_variants_sku_unique") {
    throw new DomainError("SKU_CONFLICT", "SKU already exists", {
      cause: error,
    });
  }
  if (constraint === "products_slug_unique") {
    throw new DomainError("SLUG_CONFLICT", "Product slug already exists", {
      cause: error,
    });
  }
  if (constraint === "product_variants_product_id_size_ml_unique") {
    throw new DomainError(
      "VARIANT_SIZE_CONFLICT",
      "A variant with this size already exists for the product",
      { cause: error },
    );
  }
  throw new DomainError("CONFLICT", "Product data conflicts with an existing row", {
    cause: error,
  });
}

/**
 * Product and its optional first variant either commit together or not at all.
 */
export async function createProductWithInitialVariant(
  input: CreateProductWithInitialVariantInput,
): Promise<{ productId: string; variantId: string | null }> {
  try {
    return await runDomainTransaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          name: input.name,
          slug: input.slug,
          brand: input.brand ?? null,
          category: input.category ?? null,
          description: input.description ?? null,
          status: "active",
        })
        .returning({ id: products.id });

      if (!product) {
        throw new DomainError("CONFLICT", "Failed to create product");
      }

      if (!input.initialVariant) {
        return { productId: product.id, variantId: null };
      }

      const [variant] = await tx
        .insert(productVariants)
        .values({
          productId: product.id,
          sku: input.initialVariant.sku,
          barcode: input.initialVariant.barcode ?? null,
          sizeMl: input.initialVariant.sizeMl,
          costCents: input.initialVariant.costCents,
          retailCents: input.initialVariant.retailCents,
          reorderLevel: input.initialVariant.reorderLevel,
          status: "active",
        })
        .returning({ id: productVariants.id });

      if (!variant) {
        throw new DomainError("CONFLICT", "Failed to create initial variant");
      }

      return { productId: product.id, variantId: variant.id };
    });
  } catch (error) {
    mapProductConstraint(error);
  }
}

export async function createProductVariant(
  productId: string,
  input: InitialVariantInput,
): Promise<{ variantId: string }> {
  try {
    return await runDomainTransaction(async (tx) => {
      // Aggregate product lock precedes the new child insert.
      const [product] = await tx
        .select({ id: products.id, status: products.status })
        .from(products)
        .where(eq(products.id, productId))
        .for("update")
        .limit(1);

      if (!product) throw new DomainError("NOT_FOUND", "Product not found");
      if (product.status !== "active") {
        throw new DomainError(
          "INVALID_STATE",
          "Reactivate the product before adding a variant",
        );
      }

      const [variant] = await tx
        .insert(productVariants)
        .values({
          productId,
          sku: input.sku,
          barcode: input.barcode ?? null,
          sizeMl: input.sizeMl,
          costCents: input.costCents,
          retailCents: input.retailCents,
          reorderLevel: input.reorderLevel,
          status: "active",
        })
        .returning({ id: productVariants.id });

      if (!variant) {
        throw new DomainError("CONFLICT", "Failed to create variant");
      }
      return { variantId: variant.id };
    });
  } catch (error) {
    mapProductConstraint(error);
  }
}

/**
 * Archive a product and every variant atomically.
 *
 * Balances and ledger rows are deliberately untouched. Existing detail/history
 * queries can still discover archived on-hand/reserved inventory, while active
 * selectors exclude it.
 */
export async function archiveProduct(
  productId: string,
): Promise<{ archivedVariantCount: number; idempotent: boolean }> {
  return runDomainTransaction(async (tx) => {
    const [product] = await tx
      .select({ id: products.id, status: products.status })
      .from(products)
      .where(eq(products.id, productId))
      .for("update")
      .limit(1);

    if (!product) throw new DomainError("NOT_FOUND", "Product not found");

    const variants = await tx
      .select({
        id: productVariants.id,
        status: productVariants.status,
      })
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(productVariants.id)
      .for("update");

    if (
      product.status === "archived" &&
      variants.every((variant) => variant.status === "archived")
    ) {
      return { archivedVariantCount: variants.length, idempotent: true };
    }

    const now = new Date();
    await tx
      .update(productVariants)
      .set({ status: "archived", updatedAt: now })
      .where(eq(productVariants.productId, productId));
    await tx
      .update(products)
      .set({ status: "archived", updatedAt: now })
      .where(eq(products.id, productId));

    return { archivedVariantCount: variants.length, idempotent: false };
  });
}
