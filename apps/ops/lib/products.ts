"use server";

import {
  and,
  count,
  db,
  desc,
  eq,
  ilike,
  or,
  products,
  productVariants,
  sql,
} from "@perfume-aura/db";
import {
  createProductSchema,
  createVariantSchema,
  archiveProductSchema,
  type CreateProductInput,
  type CreateVariantInput,
} from "@perfume-aura/validators";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import {
  actionError,
  actionOk,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/action-result";
import { rupeesToCents } from "@/lib/money";
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
  costCents: number;
  retailCents: number;
  quantityOnHand: number;
  qtyReserved: number;
  reorderLevel: number;
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
};

/**
 * List products with variant counts. Throws on DB failure (pages catch).
 */
export async function listProducts(
  filter: ListProductsFilter = {},
): Promise<ProductListItem[]> {
  await requireSession();

  const q = filter.q?.trim() ?? "";
  const status = filter.status ?? "active";

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

  const rows = await db
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
    .orderBy(desc(products.createdAt));

  return rows.map((r) => ({
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
}

export async function getProduct(id: string): Promise<ProductDetail | null> {
  await requireSession();

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
      costCents: productVariants.costCents,
      retailCents: productVariants.retailCents,
      quantityOnHand: productVariants.quantityOnHand,
      qtyReserved: productVariants.qtyReserved,
      reorderLevel: productVariants.reorderLevel,
      status: productVariants.status,
    })
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(productVariants.sizeMl);

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
    await requireSession();
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

    const [product] = await db
      .insert(products)
      .values({
        name: data.name.trim(),
        slug,
        brand: emptyToNull(data.brand),
        category: emptyToNull(data.category),
        description: emptyToNull(data.description),
        status: "active",
      })
      .returning({ id: products.id });

    if (!product) {
      return actionError("Failed to create product");
    }

    if (data.withVariant !== false && data.sku) {
      const costCents = rupeesToCents(Number(data.cost ?? 0));
      const retailCents = rupeesToCents(Number(data.retail ?? 0));
      const sizeMl = Number(data.sizeMl);
      const reorderLevel = Number(data.reorderLevel ?? 0);

      try {
        await db.insert(productVariants).values({
          productId: product.id,
          sku: data.sku.trim(),
          barcode: emptyToNull(data.barcode),
          sizeMl,
          costCents,
          retailCents,
          reorderLevel: Number.isFinite(reorderLevel) ? reorderLevel : 0,
          status: "active",
        });
      } catch (err) {
        // Roll back product if SKU conflict so UI can retry cleanly
        await db.delete(products).where(eq(products.id, product.id));
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("unique") || msg.includes("duplicate")) {
          return actionError("SKU already exists", {
            sku: ["This SKU is already in use"],
          });
        }
        throw err;
      }
    }

    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidatePath(`/products/${product.id}`);

    return actionOk({ productId: product.id });
  } catch (err) {
    console.error("[createProductAction]", err);
    return actionError(dbErrorMessage(err));
  }
}

export async function createVariantAction(
  raw: unknown,
): Promise<ActionResult<{ variantId: string }>> {
  try {
    await requireSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = createVariantSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Please fix the form errors", zodFieldErrors(parsed.error));
  }

  const data: CreateVariantInput = parsed.data;

  try {
    const [product] = await db
      .select({ id: products.id, status: products.status })
      .from(products)
      .where(eq(products.id, data.productId))
      .limit(1);

    if (!product) {
      return actionError("Product not found");
    }

    const [variant] = await db
      .insert(productVariants)
      .values({
        productId: data.productId,
        sku: data.sku.trim(),
        barcode: emptyToNull(data.barcode),
        sizeMl: data.sizeMl,
        costCents: rupeesToCents(data.cost),
        retailCents: rupeesToCents(data.retail),
        reorderLevel: data.reorderLevel ?? 0,
        status: "active",
      })
      .returning({ id: productVariants.id });

    if (!variant) {
      return actionError("Failed to create variant");
    }

    revalidatePath("/products");
    revalidatePath(`/products/${data.productId}`);
    revalidatePath("/stock");
    revalidatePath("/dashboard");

    return actionOk({ variantId: variant.id });
  } catch (err) {
    console.error("[createVariantAction]", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return actionError("SKU already exists", {
        sku: ["This SKU is already in use"],
      });
    }
    return actionError(dbErrorMessage(err));
  }
}

export async function archiveProductAction(
  raw: unknown,
): Promise<ActionResult> {
  try {
    await requireSession();
  } catch {
    return actionError("You must be signed in");
  }

  const parsed = archiveProductSchema.safeParse(raw);
  if (!parsed.success) {
    return actionError("Invalid product");
  }

  try {
    const [updated] = await db
      .update(products)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(products.id, parsed.data.productId))
      .returning({ id: products.id });

    if (!updated) {
      return actionError("Product not found");
    }

    await db
      .update(productVariants)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(productVariants.productId, parsed.data.productId));

    revalidatePath("/products");
    revalidatePath(`/products/${parsed.data.productId}`);
    revalidatePath("/dashboard");
    revalidatePath("/stock/low");

    return actionOk();
  } catch (err) {
    console.error("[archiveProductAction]", err);
    return actionError(dbErrorMessage(err));
  }
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
  await requireSession();

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
    .where(eq(productVariants.status, "active"))
    .orderBy(products.name, productVariants.sizeMl);

  return rows.map((r) => ({
    id: r.id,
    sku: r.sku,
    quantityOnHand: r.quantityOnHand,
    productName: r.productName,
    retailCents: r.retailCents,
    label: `${r.productName}${r.brand ? ` · ${r.brand}` : ""} — ${r.sku} (${r.sizeMl} ml) · ${r.quantityOnHand} on hand`,
  }));
}

function dbErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("ECONNREFUSED") ||
    msg.includes("DATABASE_URL") ||
    msg.includes("connect") ||
    msg.includes("password authentication") ||
    msg.includes("invalid")
  ) {
    return "Database unavailable. Check DATABASE_URL and try again.";
  }
  return "Something went wrong. Please try again.";
}
