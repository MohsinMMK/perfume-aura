import { createHash } from "node:crypto";
import {
  and,
  commerceCartItems,
  commerceCarts,
  commerceSettings,
  db,
  eq,
  productMedia,
  productPublications,
  products,
  productVariants,
  sql,
  variantPrices,
} from "@perfume-aura/db";
import type { CartLine, CartSnapshot } from "./cart-store";

const cartLifetimeMilliseconds = 30 * 24 * 60 * 60 * 1_000;

function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function expiresAt(): Date {
  return new Date(Date.now() + cartLifetimeMilliseconds);
}

function publicMediaPath(storageKey: string): string {
  if (storageKey.startsWith("/") && !storageKey.startsWith("//")) return storageKey;
  return `/media/${encodeURI(storageKey).replaceAll("%2F", "/")}`;
}

async function ensureCart(token: string): Promise<string> {
  const digest = tokenDigest(token);
  const [existing] = await db
    .select({ id: commerceCarts.id })
    .from(commerceCarts)
    .where(and(eq(commerceCarts.tokenDigest, digest), eq(commerceCarts.status, "active")))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(commerceCarts)
    .values({ tokenDigest: digest, status: "active", currency: "INR", expiresAt: expiresAt() })
    .onConflictDoNothing({ target: commerceCarts.tokenDigest })
    .returning({ id: commerceCarts.id });
  if (created) return created.id;

  const [raced] = await db
    .select({ id: commerceCarts.id })
    .from(commerceCarts)
    .where(eq(commerceCarts.tokenDigest, digest))
    .limit(1);
  if (!raced) throw new Error("Cart could not be initialized");
  return raced.id;
}

export async function readDurableCart(token: string): Promise<CartSnapshot> {
  const cartId = await ensureCart(token);
  const [rows, settingsRows] = await Promise.all([
    db
      .select({
        variantId: productVariants.id,
        productSlug: productPublications.publicSlug,
        productName: productPublications.publicName,
        imageStorageKey: productMedia.storageKey,
        sizeMl: productVariants.sizeMl,
        quantity: commerceCartItems.quantity,
        amountMinor: variantPrices.amountMinor,
      })
      .from(commerceCartItems)
      .innerJoin(productVariants, eq(productVariants.id, commerceCartItems.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .innerJoin(productPublications, eq(productPublications.productId, products.id))
      .innerJoin(variantPrices, eq(variantPrices.variantId, productVariants.id))
      .innerJoin(
        productMedia,
        and(
          eq(productMedia.productId, products.id),
          eq(productMedia.kind, "pack"),
          eq(productMedia.position, 0),
        ),
      )
      .where(
        and(
          eq(commerceCartItems.cartId, cartId),
          eq(products.status, "active"),
          eq(productVariants.status, "active"),
          eq(productPublications.status, "published"),
          eq(variantPrices.active, true),
          eq(variantPrices.currency, "INR"),
          sql`${variantPrices.approvedAt} IS NOT NULL`,
          sql`${productMedia.approvedAt} IS NOT NULL`,
          sql`${productPublications.legalApprovedAt} IS NOT NULL`,
          sql`${productPublications.contentApprovedAt} IS NOT NULL`,
          sql`${productPublications.mediaApprovedAt} IS NOT NULL`,
          sql`${productVariants.quantityOnHand} - ${productVariants.qtyReserved} >= ${commerceCartItems.quantity}`,
        ),
      ),
    db
      .select({ checkoutEnabled: commerceSettings.checkoutEnabled })
      .from(commerceSettings)
      .where(eq(commerceSettings.id, "primary"))
      .limit(1),
  ]);

  const lines: CartLine[] = rows.flatMap((row) =>
    row.productSlug && row.productName
      ? [{
          variantId: row.variantId,
          productSlug: row.productSlug,
          productName: row.productName,
          image: publicMediaPath(row.imageStorageKey),
          sizeMl: row.sizeMl,
          quantity: row.quantity,
          unitPrice: { currency: "INR" as const, amountMinor: row.amountMinor },
        }]
      : [],
  );
  const checkoutEnabled =
    settingsRows[0]?.checkoutEnabled === true &&
    process.env.STOREFRONT_CHECKOUT_RELEASE_APPROVED === "true";

  return {
    lines,
    subtotal: {
      currency: "INR",
      amountMinor: lines.reduce((sum, line) => sum + line.unitPrice.amountMinor * line.quantity, 0),
    },
    quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    checkoutEnabled,
    checkoutBlockReason: checkoutEnabled
      ? ""
      : "Checkout is locked until shipping, policy, tax, Cashfree, and production release approvals are complete.",
  };
}

export async function setDurableCartLine(
  token: string,
  variantId: string,
  quantity: number,
): Promise<CartSnapshot> {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10) {
    throw new Error("Quantity must be an integer from 0 to 10");
  }
  const digest = tokenDigest(token);

  await db.transaction(async (transaction) => {
    let [cart] = await transaction
      .select({ id: commerceCarts.id })
      .from(commerceCarts)
      .where(eq(commerceCarts.tokenDigest, digest))
      .for("update")
      .limit(1);
    if (!cart) {
      [cart] = await transaction
        .insert(commerceCarts)
        .values({ tokenDigest: digest, status: "active", currency: "INR", expiresAt: expiresAt() })
        .returning({ id: commerceCarts.id });
    }
    if (!cart) throw new Error("Cart could not be initialized");

    if (quantity === 0) {
      await transaction
        .delete(commerceCartItems)
        .where(and(eq(commerceCartItems.cartId, cart.id), eq(commerceCartItems.variantId, variantId)));
    } else {
      const [variant] = await transaction
        .select({
          id: productVariants.id,
          available: sql<number>`${productVariants.quantityOnHand} - ${productVariants.qtyReserved}`,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .innerJoin(productPublications, eq(productPublications.productId, products.id))
        .innerJoin(variantPrices, eq(variantPrices.variantId, productVariants.id))
        .where(
          and(
            eq(productVariants.id, variantId),
            eq(productVariants.status, "active"),
            eq(products.status, "active"),
            eq(productPublications.status, "published"),
            eq(variantPrices.active, true),
            eq(variantPrices.currency, "INR"),
            sql`${variantPrices.approvedAt} IS NOT NULL`,
            sql`${productPublications.legalApprovedAt} IS NOT NULL`,
            sql`${productPublications.contentApprovedAt} IS NOT NULL`,
            sql`${productPublications.mediaApprovedAt} IS NOT NULL`,
          ),
        )
        .for("update", { of: productVariants })
        .limit(1);
      if (!variant || Number(variant.available) < quantity) {
        throw new Error("This item is unavailable in the requested quantity");
      }
      await transaction
        .insert(commerceCartItems)
        .values({ cartId: cart.id, variantId, quantity })
        .onConflictDoUpdate({
          target: [commerceCartItems.cartId, commerceCartItems.variantId],
          set: { quantity, updatedAt: new Date() },
        });
    }
    await transaction
      .update(commerceCarts)
      .set({ expiresAt: expiresAt(), updatedAt: new Date() })
      .where(eq(commerceCarts.id, cart.id));
  });

  return readDurableCart(token);
}
