import type { StorefrontProduct, StorefrontVariant } from "./catalog";
import type { CartImageTone } from "./cart-store";

const houseBottleImageBySize: Readonly<
  Partial<Record<StorefrontVariant["sizeMl"], string>>
> = {
  30: "/images/bottle-30ml.webp",
  50: "/images/bottle-50ml.webp",
  100: "/images/bottle-100ml.webp",
};

type CartMediaProduct = Readonly<
  Pick<StorefrontProduct, "collectionSlug" | "image">
>;

export type CartMedia = Readonly<{
  image: string;
  imageTone?: CartImageTone;
}>;

export function resolveCartMedia(
  product: CartMediaProduct,
  variant: Pick<StorefrontVariant, "sizeMl">,
): CartMedia {
  if (product.collectionSlug === "signature") {
    // Signature artwork is product-specific. Keep the supplied campaign frame
    // instead of substituting a differently labelled generic bottle.
    return { image: product.image, imageTone: "signature" };
  }

  if (
    product.collectionSlug === "inspired" ||
    product.collectionSlug === "unknown"
  ) {
    return {
      image: houseBottleImageBySize[variant.sizeMl] ?? product.image,
      imageTone: "inspired",
    };
  }

  return { image: product.image };
}
