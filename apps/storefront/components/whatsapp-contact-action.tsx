"use client";

import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { usePathname } from "next/navigation";
import type { Money } from "@/lib/money";
import {
  createProductWhatsAppUrl,
  whatsappContactUrl,
} from "@/lib/whatsapp-contact";
import { captureStorefrontAction } from "@/lib/posthog-client";

export function WhatsAppContactAction() {
  const pathname = usePathname();
  const isProductPage = pathname.startsWith("/products/");

  return (
    <a
      href={whatsappContactUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with Perfume Aura on WhatsApp"
      onClick={() => captureStorefrontAction("floating_action", "open_whatsapp")}
      className={`aura-whatsapp-action${isProductPage ? " aura-whatsapp-action--product" : ""}`}
    >
      <span className="aura-whatsapp-label" aria-hidden="true">
        Chat on WhatsApp
      </span>
      <span className="aura-whatsapp-icon" aria-hidden="true">
        <HugeiconsIcon icon={WhatsappIcon} strokeWidth={1.8} />
      </span>
    </a>
  );
}

export function ProductWhatsAppAction({
  productName,
  sizeMl,
  quantity,
  unitPrice,
  totalPrice,
}: Readonly<{
  productName: string;
  sizeMl: number | null;
  quantity: number;
  unitPrice: Money | null;
  totalPrice: Money | null;
}>) {
  const productWhatsAppUrl = createProductWhatsAppUrl({
    productName,
    sizeMl,
    quantity,
    unitPrice,
    totalPrice,
  });

  return (
    <a
      href={productWhatsAppUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`Buy ${productName} through WhatsApp`}
      onClick={() => captureStorefrontAction("product_purchase", "open_whatsapp")}
      className="aura-cream-action mt-auto flex min-h-12 w-full items-center justify-between rounded-[var(--aura-radius)] px-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aura-ivory)] sm:mt-0 sm:hidden"
    >
      <span className="font-display text-base tracking-[0.02em]">Buy through WhatsApp</span>
      <span className="flex items-center gap-2 font-display text-sm tracking-[0.03em]">
        <span className="grid size-8 place-items-center rounded-full bg-[#25d366] text-white" aria-hidden="true">
          <HugeiconsIcon icon={WhatsappIcon} strokeWidth={1.8} className="size-[1.15rem]" />
        </span>
      </span>
    </a>
  );
}
