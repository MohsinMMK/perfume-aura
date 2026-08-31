export type InvoiceShareDetails = Readonly<{
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  total: string;
  balance: string;
  items: readonly string[];
}>;

export function normalizeWhatsAppRecipient(phone: string): string | null {
  const digits = phone.replace(/\D/gu, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export function createInvoiceWhatsAppUrl(
  details: InvoiceShareDetails,
): string | null {
  const recipient = normalizeWhatsAppRecipient(details.customerPhone);
  if (!recipient) return null;

  const lines = [
    `Hello ${details.customerName},`,
    "",
    `Your Perfume Aura invoice ${details.invoiceNumber} is ready.`,
    ...details.items.map((item) => `• ${item}`),
    `Total: ${details.total}`,
    `Balance: ${details.balance}`,
    "",
    "Thank you for choosing Perfume Aura.",
  ];
  return `https://wa.me/${recipient}?text=${encodeURIComponent(lines.join("\n"))}`;
}
