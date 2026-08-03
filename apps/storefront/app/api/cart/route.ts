import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findStorefrontVariant } from "@/lib/catalog";
import {
  isPreviewCatalogEnabled,
  isPublicCatalogEnabled,
} from "@/lib/catalog-policy";
import {
  readPreviewCart,
  readReleaseLockedCart,
  setPreviewCartLine,
} from "@/lib/cart-store";
import type { CartSnapshot } from "@/lib/cart-store";

const cartCookieName = "pa_storefront_cart";

const cartMutationSchema = z.object({
  variantId: z.string().min(1).max(120),
  quantity: z.number().int().min(0).max(10),
});

function resolveToken(request: NextRequest): Readonly<{
  token: string;
  created: boolean;
}> {
  const existing = request.cookies.get(cartCookieName)?.value;
  if (existing && /^[A-Za-z0-9_-]{43}$/.test(existing)) {
    return { token: existing, created: false };
  }

  return { token: randomBytes(32).toString("base64url"), created: true };
}

function withCartCookie(
  response: NextResponse,
  token: string,
  created: boolean,
): NextResponse {
  if (created) {
    response.cookies.set(cartCookieName, token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { token, created } = resolveToken(request);
  try {
    const previewCatalog = isPreviewCatalogEnabled();
    let cart: CartSnapshot;
    if (previewCatalog) {
      cart = readPreviewCart(token);
    } else if (isPublicCatalogEnabled()) {
      const { readDurableCart } = await import("@/lib/durable-cart");
      cart = await readDurableCart(token);
    } else {
      cart = readReleaseLockedCart();
    }
    return withCartCookie(NextResponse.json(cart), token, created);
  } catch (error) {
    console.error("[storefront cart] failed to read cart", error);
    return NextResponse.json({ error: "Cart is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const parsedBody = cartMutationSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid cart request." },
      { status: 400 },
    );
  }

  const { token, created } = resolveToken(request);
  try {
    const previewCatalog = isPreviewCatalogEnabled();
    if (!previewCatalog && !isPublicCatalogEnabled()) {
      return NextResponse.json(
        { error: "The public catalog is not released yet." },
        { status: 409 },
      );
    }

    if (!previewCatalog) {
      const { setDurableCartLine } = await import("@/lib/durable-cart");
      const cart = await setDurableCartLine(
        token,
        parsedBody.data.variantId,
        parsedBody.data.quantity,
      );
      return withCartCookie(NextResponse.json(cart), token, created);
    }

    const resolved = await findStorefrontVariant(parsedBody.data.variantId);
    if (!resolved?.variant.price || !resolved.variant.purchasable) {
      return NextResponse.json(
        { error: "This item is not currently purchasable." },
        { status: 409 },
      );
    }
    const cart = setPreviewCartLine(
      token,
      {
        variantId: resolved.variant.id,
        productSlug: resolved.product.slug,
        productName: resolved.product.name,
        image: resolved.product.image,
        sizeMl: resolved.variant.sizeMl,
        unitPrice: resolved.variant.price,
      },
      parsedBody.data.quantity,
    );
    return withCartCookie(NextResponse.json(cart), token, created);
  } catch (error) {
    console.error("[storefront cart] failed to update cart", error);
    return NextResponse.json({ error: "This cart change could not be completed." }, { status: 409 });
  }
}
