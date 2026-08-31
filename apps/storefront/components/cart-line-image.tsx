import Image from "next/image";
import type { CartLine } from "@/lib/cart-store";

export function CartLineImage({
  line,
  sizes,
}: Readonly<{
  line: CartLine;
  sizes: string;
}>) {
  const frameClassName =
    line.imageTone === "signature"
      ? "bg-[var(--aura-card-signature)]"
      : line.imageTone === "inspired"
        ? "bg-[var(--aura-card-inspired)]"
        : "bg-[#211f1d]";
  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-[var(--aura-radius)] ${frameClassName}`}
    >
      <Image
        src={line.image}
        alt=""
        fill
        sizes={sizes}
        className="object-contain"
      />
    </div>
  );
}
