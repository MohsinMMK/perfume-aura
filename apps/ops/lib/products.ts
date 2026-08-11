"use server";

import {
  and,
  archiveProductVariant,
  archiveProduct,
  count,
  createProductVariant,
  createProductWithInitialVariant,
  db,
  desc,
  DomainError,
  eq,
  ilike,
  or,
  postgresSqlState,
  products,
  productVariants,
  reactivateProduct,
  reactivateProductVariant,
  sql,
  updateProduct,
  updateProductVariant,
} from "@perfume-aura/db";
import {
  createProductSchema,
  createVariantSchema,
  archiveProductSchema,
  reactivateProductSchema,
  updateProductSchema,
  updateVariantSchema,
  variantLifecycleSchema,
  type CreateProductInput,
  type CreateVariantInput,
  type UpdateProductInput,
  type UpdateVariantInput,
} from "@perfume-aura/validators";
import { revalidatePath } from "next/cache";
import { hasOpsCapability } from "@/lib/ops-access";
import { requireCapability } from "@/lib/session";
import {
  actionError,
  actionOk,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/action-result";
import { rupeesToPaise } from "@/lib/money";
import {
  normalizePageSize,
  pageOffset,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from "@/lib/pagination";
import { shortId, slugify } from "@/lib/slug";

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  category: string | null;
  status: "active" | "archived";
  variantCount: number;
  totalOnHand: number;
  createdAt: Date;
};

export type VariantRow = {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  sizeMl: number;
  costCents: number | null;
  retailCents: number | null;
  quantityOnHand: number;
  qtyReserved: number;
  reorderLevel: number;
  version: number;
  status: "active" | "archived";
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  status: "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
  variants: VariantRow[];
};

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, base))
    .limit(1);

  if (!existing[0]) return base;
  return `${base}-${shortId(6)}`;
}

export type ListProductsFilter = {
  /** Free-text match on name, brand, category, or any variant SKU. */
  q?: string;
  /** Default: active only. Use "all" to include archived. */
  status?: "active" | "archived" | "all";
  page?: number;
  pageSize?: number;
};

/**
 * List products with variant counts. Throws on DB failure (pages catch).
 */
export async function listProducts(
  filter: ListProductsFilter = {},
): Promise<PaginatedResult<ProductListItem>> {
  await requireCapability("catalog.view");

  const q = filter.q?.trim() ?? "";
  const status = filter.status ?? "active";
  const page = parsePage(filter.page);
  const pageSize = normalizePageSize(filter.pageSize);

  const conditions = [];
  if (status !== "all") {
    conditions.push(eq(products.status, status));
  }
  if (q.length > 0) {
    const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(products.name, pattern),
        ilike(products.brand, pattern),
        ilike(products.category, pattern),
        sql`exists (
          select 1 from ${productVariants}
          where ${productVariants.productId} = ${products.id}
            and ${productVariants.sku} ilike ${pattern}
        )`,
      ),
    );
  }

  const whereClause =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        brand: products.brand,
        category: products.category,
        status: products.status,
        createdAt: products.createdAt,
        variantCount: count(productVariants.id),
        totalOnHand: sql<number>`coalesce(sum(${productVariants.quantityOnHand}), 0)::int`,
      })
      .from(products)
      .leftJoin(productVariants, eq(productVariants.productId, products.id))
      .where(whereClause)
      .groupBy(products.id)
      .orderBy(desc(products.createdAt), desc(products.id))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db
      .select({ total: count(products.id) })
      .from(products)
      .where(whereClause),
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    brand: r.brand,
    category: r.category,
    status: r.status,
    createdAt: r.createdAt,
    variantCount: Number(r.variantCount),
    totalOnHand: Number(r.totalOnHand),
  }));
  return paginatedResult(
    items,
    Number(totalRows[0]?.total ?? 0),
    page,
    pageSize,
  );
}

export async function getProduct(id: string): Promise<ProductDetail | null> {
  const session = await requireCapability("catalog.view");
  const canManageCommercials = hasOpsCapability(
    session.user.role,
    "catalog.manage-commercials",
  );

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product) return null;

  const variants = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      sku: productVariants.sku,
      barcode: productVariants.barcode,
      sizeMl: productVariants.sizeMl,
      costCents: canManageCommercials
        ? productVariants.costCents
        : sql<number | null>`null::int`,
      retailCents: canManageCommercials
        ? productVariants.retailCents
        : sql<number | null>`null::int`,
      quantityOnHand: productVariants.quantityOnHand,
      qtyReserved: productVariants.qtyReserved,
      reorderLevel: productVariants.reorderLevel,
      version: productVariants.version,
      status: productVariants.status,
    })
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(productVariants.sizeMl, productVariants.id);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    category: product.category,
    description: product.description,
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    variants,
  };
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
}

export async function createProductAction(
  raw: unknown,
): Promise<ActionResult<{ productId: string }>> {
  try {
    await requireCapability("catalog.manage-commercials");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = createProductSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }

  const data: CreateProductInput = parsed.data;

  try {
    const slug = await uniqueSlug(data.name);

    const created = await createProductWithInitialVariant({
      name: data.name.trim(),
      slug,
      brand: emptyToNull(data.brand),
      category: emptyToNull(data.category),
      description: emptyToNull(data.description),
      initialVariant:
        data.withVariant !== false && data.sku
          ? {
              sku: data.sku.trim(),
              barcode: emptyToNull(data.barcode),
              sizeMl: Number(data.sizeMl),
              costCents: rupeesToPaise(Number(data.cost ?? 0)),
              retailCents: rupeesToPaise(Number(data.retail ?? 0)),
              reorderLevel: Number(data.reorderLevel ?? 0),
            }
          : undefined,
    });

    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidatePath(`/products/${created.productId}`);

    return actionOk({ productId: created.productId });
  } catch (err) {
    console.error("[createProductAction]", err);
    if (err instanceof DomainError) {
      if (err.code === "SKU_CONFLICT") {
        return actionError(err.message, {
          sku: ["This SKU is already in use"],
        });
      }
      return actionError(err.message);
    }
    return actionError(dbErrorMessage(err));
  }
}

export async function createVariantAction(
  raw: unknown,
): Promise<ActionResult<{ variantId: string }>> {
  try {
    await requireCapability("catalog.manage-commercials");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = createVariantSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }

  const data: CreateVariantInput = parsed.data;

  try {
    const variant = await createProductVariant(data.productId, {
        sku: data.sku.trim(),
        barcode: emptyToNull(data.barcode),
        sizeMl: data.sizeMl,
        costCents: rupeesToPaise(data.cost),
        retailCents: rupeesToPaise(data.retail),
        reorderLevel: data.reorderLevel ?? 0,
      });

    revalidatePath("/products");
    revalidatePath(`/products/${data.productId}`);
    revalidatePath("/stock");
    revalidatePath("/dashboard");

    return actionOk({ variantId: variant.variantId });
  } catch (err) {
    console.error("[createVariantAction]", err);
    if (err instanceof DomainError) {
      if (err.code === "SKU_CONFLICT") {
        return actionError(err.message, {
          sku: ["This SKU is already in use"],
        });
      }
      return actionError(err.message);
    }
    return actionError(dbErrorMessage(err));
  }
}

export async function archiveProductAction(
  raw: unknown,
): Promise<ActionResult> {
  try {
    await requireCapability("catalog.manage-commercials");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = archiveProductSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Invalid product");
  }

  try {
    await archiveProduct(parsed.data.productId, {
      expectedUpdatedAt: new Date(parsed.data.expectedUpdatedAt),
    });

    revalidateProductPaths(parsed.data.productId);

    return actionOk();
  } catch (err) {
    console.error("[archiveProductAction]", err);
    if (err instanceof DomainError) return actionError(err.message);
    return actionError(dbErrorMessage(err));
  }
}

export async function updateProductAction(
  raw: unknown,
): Promise<ActionResult<{ updatedAt: string }>> {
  try {
    await requireCapability("catalog.edit-content");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = updateProductSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }
  const data: UpdateProductInput = parsed.data;

  try {
    const result = await updateProduct({
      productId: data.productId,
      expectedUpdatedAt: new Date(data.expectedUpdatedAt),
      name: data.name,
      brand: emptyToNull(data.brand),
      category: emptyToNull(data.category),
      description: emptyToNull(data.description),
    });
    revalidateProductPaths(data.productId);
    return actionOk({ updatedAt: result.updatedAt.toISOString() });
  } catch (error) {
    return productActionFailure(error, "Could not update product");
  }
}

export async function reactivateProductAction(
  raw: unknown,
): Promise<ActionResult<{ updatedAt: string }>> {
  try {
    await requireCapability("catalog.manage-commercials");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = reactivateProductSchema.safeParse(raw);
  if (!parsed.success) return actionError("Invalid product");

  try {
    const result = await reactivateProduct({
      productId: parsed.data.productId,
      expectedUpdatedAt: new Date(parsed.data.expectedUpdatedAt),
    });
    revalidateProductPaths(parsed.data.productId);
    return actionOk({ updatedAt: result.updatedAt.toISOString() });
  } catch (error) {
    return productActionFailure(error, "Could not reactivate product");
  }
}

export async function updateVariantAction(
  raw: unknown,
): Promise<ActionResult<{ version: number }>> {
  try {
    await requireCapability("catalog.manage-commercials");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = updateVariantSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }
  const data: UpdateVariantInput = parsed.data;

  try {
    const result = await updateProductVariant({
      productId: data.productId,
      variantId: data.variantId,
      expectedVersion: data.expectedVersion,
      sku: data.sku.trim(),
      barcode: emptyToNull(data.barcode),
      sizeMl: data.sizeMl,
      costCents: rupeesToPaise(data.cost),
      retailCents: rupeesToPaise(data.retail),
      reorderLevel: data.reorderLevel,
    });
    revalidateProductPaths(data.productId);
    return actionOk({ version: result.version });
  } catch (error) {
    if (error instanceof DomainError && error.code === "SKU_CONFLICT") {
      return actionError(error.message, {
        sku: ["This SKU is already in use"],
      });
    }
    return productActionFailure(error, "Could not update variant");
  }
}

export async function archiveVariantAction(
  raw: unknown,
): Promise<ActionResult<{ version: number }>> {
  return setVariantStatusAction(raw, "archived");
}

export async function reactivateVariantAction(
  raw: unknown,
): Promise<ActionResult<{ version: number }>> {
  return setVariantStatusAction(raw, "active");
}

async function setVariantStatusAction(
  raw: unknown,
  status: "active" | "archived",
): Promise<ActionResult<{ version: number }>> {
  try {
    await requireCapability("catalog.manage-commercials");
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = variantLifecycleSchema.safeParse(raw);
  if (!parsed.success) return actionError("Invalid variant");

  try {
    const operation =
      status === "active" ? reactivateProductVariant : archiveProductVariant;
    const result = await operation(parsed.data);
    revalidateProductPaths(parsed.data.productId);
    return actionOk({ version: result.version });
  } catch (error) {
    return productActionFailure(
      error,
      status === "active"
        ? "Could not reactivate variant"
        : "Could not archive variant",
    );
  }
}

function revalidateProductPaths(productId: string): void {
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/stock");
  revalidatePath("/stock/low");
  revalidatePath("/dashboard");
  revalidatePath("/finance");
  revalidatePath("/invoices");
}

function productActionFailure(
  error: unknown,
  fallback: string,
): ActionResult<never> {
  if (error instanceof DomainError) return actionError(error.message);
  console.error(`[product-action] ${fallback}`, error);
  return actionError(dbErrorMessage(error));
}

/** Active variants for stock forms (label + id). */
export async function listActiveVariantsForSelect(): Promise<
  {
    id: string;
    label: string;
    quantityOnHand: number;
    productName: string;
    sku: string;
    retailCents: number;
  }[]
> {
  await requireCapability("invoices.draft");

  const rows = await db
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      sizeMl: productVariants.sizeMl,
      quantityOnHand: productVariants.quantityOnHand,
      retailCents: productVariants.retailCents,
      productName: products.name,
      brand: products.brand,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(
      and(
        eq(productVariants.status, "active"),
        eq(products.status, "active"),
      ),
    )
    .orderBy(products.name, productVariants.sizeMl, productVariants.id);

  return rows.map((r) => ({
    id: r.id,
    sku: r.sku,
    quantityOnHand: r.quantityOnHand,
    productName: r.productName,
    retailCents: r.retailCents,
    label: `${r.productName}${r.brand ? ` · ${r.brand}` : ""} — ${r.sku} (${r.sizeMl} ml) · ${r.quantityOnHand} on hand`,
  }));
}

/** Stock receiving needs a safe selector without commercial values. */
export async function listActiveVariantsForStockSelect(): Promise<
  {
    id: string;
    label: string;
  }[]
> {
  await requireCapability("stock.view");

  const rows = await db
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      sizeMl: productVariants.sizeMl,
      quantityOnHand: productVariants.quantityOnHand,
      productName: products.name,
      brand: products.brand,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(
      and(
        eq(productVariants.status, "active"),
        eq(products.status, "active"),
      ),
    )
    .orderBy(products.name, productVariants.sizeMl, productVariants.id);

  return rows.map((row) => ({
    id: row.id,
    label: `${row.productName}${row.brand ? ` · ${row.brand}` : ""} — ${row.sku} (${row.sizeMl} ml) · ${row.quantityOnHand} on hand`,
  }));
}

function dbErrorMessage(err: unknown): string {
  const sqlState = postgresSqlState(err);
  if (sqlState?.startsWith("08") || sqlState === "28P01") {
    return "Database unavailable. Check DATABASE_URL and try again.";
  }
  return "Something went wrong. Please try again.";
}
