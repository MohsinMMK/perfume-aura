import type { Money } from "./money";

export type CartLine = Readonly<{
  variantId: string;
  productSlug: string;
  productName: string;
  image: string;
  sizeMl: number;
  quantity: number;
  unitPrice: Money;
}>;

export type CartSnapshot = Readonly<{
  lines: readonly CartLine[];
  subtotal: Money;
  quantity: number;
  checkoutEnabled: boolean;
  checkoutBlockReason: string;
}>;

const checkoutReleaseBlockReason =
  "Checkout is locked until shipping, policy, tax, Cashfree, and production catalog approvals are complete.";

type MutableCart = {
  lines: Map<string, CartLine>;
};

const globalCartStore = globalThis as typeof globalThis & {
  perfumeAuraPreviewCarts?: Map<string, MutableCart>;
};

const previewCarts =
  globalCartStore.perfumeAuraPreviewCarts ?? new Map<string, MutableCart>();

if (process.env.NODE_ENV !== "production") {
  globalCartStore.perfumeAuraPreviewCarts = previewCarts;
}

function mutableCart(token: string): MutableCart {
  const existing = previewCarts.get(token);
  if (existing) return existing;

  const created = { lines: new Map<string, CartLine>() };
  previewCarts.set(token, created);
  return created;
}

export function readPreviewCart(token: string): CartSnapshot {
  const lines = [...mutableCart(token).lines.values()];
  return {
    lines,
    subtotal: {
      currency: "INR",
      amountMinor: lines.reduce(
        (total, line) => total + line.unitPrice.amountMinor * line.quantity,
        0,
      ),
    },
    quantity: lines.reduce((total, line) => total + line.quantity, 0),
    checkoutEnabled: false,
    checkoutBlockReason: checkoutReleaseBlockReason,
  };
}

export function readReleaseLockedCart(): CartSnapshot {
  return {
    lines: [],
    subtotal: { currency: "INR", amountMinor: 0 },
    quantity: 0,
    checkoutEnabled: false,
    checkoutBlockReason: checkoutReleaseBlockReason,
  };
}

export function setPreviewCartLine(
  token: string,
  line: Omit<CartLine, "quantity">,
  quantity: number,
): CartSnapshot {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10) {
    throw new Error("Quantity must be an integer from 0 to 10");
  }

  const cart = mutableCart(token);
  if (quantity === 0) {
    cart.lines.delete(line.variantId);
  } else {
    cart.lines.set(line.variantId, { ...line, quantity });
  }

  return readPreviewCart(token);
}
