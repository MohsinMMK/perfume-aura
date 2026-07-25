import { and, eq, sql } from "drizzle-orm";
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

export type UpdateProductInput = {
  productId: string;
  expectedUpdatedAt: Date;
  name: string;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
};

export type UpdateProductVariantInput = InitialVariantInput & {
  productId: string;
  variantId: string;
  expectedVersion: number;
};

export type ProductLifecycleInput = {
  productId: string;
  expectedUpdatedAt: Date;
};

export type VariantLifecycleInput = {
  productId: string;
  variantId: string;
  expectedVersion: number;
};

function assertCurrentProduct(
  actualUpdatedAt: Date,
  expectedUpdatedAt: Date,
): void {
  if (actualUpdatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    throw new DomainError(
      "STALE_WRITE",
      "This product changed after you opened it. Reload and try again.",
    );
  }
}

function assertCurrentVariant(
  actualVersion: number,
  expectedVersion: number,
): void {
  if (actualVersion !== expectedVersion) {
    throw new DomainError(
      "STALE_WRITE",
      "This variant changed after you opened it. Reload and try again.",
    );
  }
}

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

/** Update product metadata without changing its lifecycle state. */
export async function updateProduct(
  input: UpdateProductInput,
): Promise<{ updatedAt: Date }> {
  return runDomainTransaction(async (tx) => {
    const [product] = await tx
      .select({
        id: products.id,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(eq(products.id, input.productId))
      .for("update")
      .limit(1);

    if (!product) throw new DomainError("NOT_FOUND", "Product not found");
    assertCurrentProduct(product.updatedAt, input.expectedUpdatedAt);

    const updatedAt = new Date();
    await tx
      .update(products)
      .set({
        name: input.name,
        brand: input.brand ?? null,
        category: input.category ?? null,
        description: input.description ?? null,
        updatedAt,
      })
      .where(eq(products.id, input.productId));

    return { updatedAt };
  });
}

/** Update catalog fields only; balances and reservations are never touched. */
export async function updateProductVariant(
  input: UpdateProductVariantInput,
): Promise<{ productId: string; version: number }> {
  try {
    return await runDomainTransaction(async (tx) => {
      const [product] = await tx
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, input.productId))
        .for("update")
        .limit(1);

      if (!product) throw new DomainError("NOT_FOUND", "Product not found");

      const [variant] = await tx
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          version: productVariants.version,
        })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.id, input.variantId),
            eq(productVariants.productId, input.productId),
          ),
        )
        .for("update")
        .limit(1);

      if (!variant) throw new DomainError("NOT_FOUND", "Variant not found");
      assertCurrentVariant(variant.version, input.expectedVersion);

      const version = variant.version + 1;
      await tx
        .update(productVariants)
        .set({
          sku: input.sku,
          barcode: input.barcode ?? null,
          sizeMl: input.sizeMl,
          costCents: input.costCents,
          retailCents: input.retailCents,
          reorderLevel: input.reorderLevel,
          version,
          updatedAt: new Date(),
        })
        .where(eq(productVariants.id, input.variantId));

      return { productId: variant.productId, version };
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
  options?: { expectedUpdatedAt?: Date },
): Promise<{ archivedVariantCount: number; idempotent: boolean }> {
  return runDomainTransaction(async (tx) => {
    const [product] = await tx
      .select({
        id: products.id,
        status: products.status,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(eq(products.id, productId))
      .for("update")
      .limit(1);

    if (!product) throw new DomainError("NOT_FOUND", "Product not found");
    if (options?.expectedUpdatedAt) {
      assertCurrentProduct(product.updatedAt, options.expectedUpdatedAt);
    }

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
      .set({
        status: "archived",
        version: sql`${productVariants.version} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(productVariants.productId, productId),
          eq(productVariants.status, "active"),
        ),
      );
    await tx
      .update(products)
      .set({ status: "archived", updatedAt: now })
      .where(eq(products.id, productId));

    return {
      archivedVariantCount: variants.filter(
        (variant) => variant.status === "active",
      ).length,
      idempotent: false,
    };
  });
}

/**
 * Reactivate only the product aggregate. Variants remain archived until the
 * owner explicitly reviews and reactivates each SKU.
 */
export async function reactivateProduct(
  input: ProductLifecycleInput,
): Promise<{ idempotent: boolean; updatedAt: Date }> {
  return runDomainTransaction(async (tx) => {
    const [product] = await tx
      .select({
        id: products.id,
        status: products.status,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(eq(products.id, input.productId))
      .for("update")
      .limit(1);

    if (!product) throw new DomainError("NOT_FOUND", "Product not found");
    assertCurrentProduct(product.updatedAt, input.expectedUpdatedAt);

    if (product.status === "active") {
      return { idempotent: true, updatedAt: product.updatedAt };
    }

    const updatedAt = new Date();
    await tx
      .update(products)
      .set({ status: "active", updatedAt })
      .where(eq(products.id, input.productId));

    return { idempotent: false, updatedAt };
  });
}

export async function archiveProductVariant(
  input: VariantLifecycleInput,
): Promise<{ idempotent: boolean; productId: string; version: number }> {
  return setVariantLifecycleStatus(input, "archived");
}

export async function reactivateProductVariant(
  input: VariantLifecycleInput,
): Promise<{ idempotent: boolean; productId: string; version: number }> {
  return setVariantLifecycleStatus(input, "active");
}

async function setVariantLifecycleStatus(
  input: VariantLifecycleInput,
  nextStatus: "active" | "archived",
): Promise<{ idempotent: boolean; productId: string; version: number }> {
  return runDomainTransaction(async (tx) => {
    // Product-first locking preserves the aggregate lock order used elsewhere.
    const [product] = await tx
      .select({ id: products.id, status: products.status })
      .from(products)
      .where(eq(products.id, input.productId))
      .for("update")
      .limit(1);

    if (!product) throw new DomainError("NOT_FOUND", "Product not found");
    if (nextStatus === "active" && product.status !== "active") {
      throw new DomainError(
        "INVALID_STATE",
        "Reactivate the product before reactivating a variant",
      );
    }

    const [variant] = await tx
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        status: productVariants.status,
        version: productVariants.version,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, input.variantId),
          eq(productVariants.productId, input.productId),
        ),
      )
      .for("update")
      .limit(1);

    if (!variant) throw new DomainError("NOT_FOUND", "Variant not found");
    assertCurrentVariant(variant.version, input.expectedVersion);

    if (variant.status === nextStatus) {
      return {
        idempotent: true,
        productId: variant.productId,
        version: variant.version,
      };
    }

    const version = variant.version + 1;
    await tx
      .update(productVariants)
      .set({
        status: nextStatus,
        version,
        updatedAt: new Date(),
      })
      .where(eq(productVariants.id, input.variantId));

    return {
      idempotent: false,
      productId: variant.productId,
      version,
    };
  });
}
