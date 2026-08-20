"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartSnapshot } from "@/lib/cart-store";

type CartContextValue = Readonly<{
  cart: CartSnapshot | null;
  loading: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  refreshCart: () => Promise<void>;
  addItem: (variantId: string) => Promise<void>;
  setQuantity: (variantId: string, quantity: number) => Promise<void>;
}>;

const CartContext = createContext<CartContextValue | null>(null);

async function requestCart(
  method: "GET" | "POST",
  body?: Readonly<{ variantId: string; quantity: number }>,
  signal?: AbortSignal,
): Promise<CartSnapshot> {
  let response: Response;
  try {
    response = await fetch("/api/cart", {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      signal,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("Cart is temporarily unavailable. Please try again.", {
      cause: error,
    });
  }

  let payload: CartSnapshot & { error?: string };
  try {
    payload = (await response.json()) as CartSnapshot & { error?: string };
  } catch (error: unknown) {
    throw new Error("Cart returned an invalid response. Please try again.", {
      cause: error,
    });
  }
  if (!response.ok) {
    throw new Error(payload.error ?? "Cart request failed");
  }
  return payload;
}

export function CartProvider({
  children,
  initialCart,
  loadRemoteCart,
}: Readonly<{
  children: ReactNode;
  initialCart: CartSnapshot | null;
  loadRemoteCart: boolean;
}>) {
  const [cart, setCart] = useState<CartSnapshot | null>(initialCart);
  const [loading, setLoading] = useState(loadRemoteCart);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refreshCart = useCallback(async () => {
    setLoading(true);
    try {
      setCart(await requestCart("GET"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadRemoteCart) return;

    let active = true;
    const controller = new AbortController();
    requestCart("GET", undefined, controller.signal)
      .then((nextCart) => {
        if (active) setCart(nextCart);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Unable to load storefront cart", error);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [loadRemoteCart]);

  const setQuantity = useCallback(async (variantId: string, quantity: number) => {
    setLoading(true);
    try {
      setCart(await requestCart("POST", { variantId, quantity }));
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = useCallback(
    async (variantId: string) => {
      const currentQuantity =
        cart?.lines.find((line) => line.variantId === variantId)?.quantity ?? 0;
      await setQuantity(variantId, Math.min(currentQuantity + 1, 10));
      setDrawerOpen(true);
    },
    [cart, setQuantity],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      drawerOpen,
      setDrawerOpen,
      refreshCart,
      addItem,
      setQuantity,
    }),
    [addItem, cart, drawerOpen, loading, refreshCart, setQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return value;
}
