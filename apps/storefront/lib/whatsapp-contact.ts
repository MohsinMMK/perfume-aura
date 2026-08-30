import type { Money } from "./money";
import { formatMoney } from "./money";

export const whatsappContactNumber = "919549549060";
export const whatsappContactDisplayNumber = "+91 95495 49060";

const whatsappContactMessage = encodeURIComponent(
  "Hi Perfume Aura, I’d like to know more about your fragrances.",
);

export const whatsappContactUrl =
  `https://wa.me/${whatsappContactNumber}?text=${whatsappContactMessage}`;

export type ProductWhatsAppDetails = Readonly<{
  productName: string;
  sizeMl: number | null;
  quantity: number;
  unitPrice: Money | null;
  totalPrice: Money | null;
}>;

function normalizeWhatsAppField(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

export function createProductWhatsAppUrl({
  productName,
  sizeMl,
  quantity,
  unitPrice,
  totalPrice,
}: ProductWhatsAppDetails): string {
  const message = [
    "Hi Perfume Aura, I’d like to buy this fragrance:",
    `Product: ${normalizeWhatsAppField(productName)}`,
    `Size: ${sizeMl ? `${sizeMl} ml` : "Please confirm"}`,
    `Quantity: ${quantity}`,
    `Price per bottle: ${unitPrice ? formatMoney(unitPrice) : "Please confirm"}`,
    `Total: ${totalPrice ? formatMoney(totalPrice) : "Please confirm"}`,
    "Please help me complete the order.",
  ].join("\n");

  return `https://wa.me/${whatsappContactNumber}?text=${encodeURIComponent(message)}`;
}
