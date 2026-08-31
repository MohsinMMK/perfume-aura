import Link from "next/link";
import { buttonVariants } from "@perfume-aura/ui/components/button";
import { cn } from "@perfume-aura/ui/lib/utils";

export function InvoiceShareActions({
  invoiceId,
  whatsappUrl,
}: {
  invoiceId: string;
  whatsappUrl: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/invoices/${invoiceId}/print`}
        className={buttonVariants({ variant: "outline" })}
        target="_blank"
      >
        Print / save PDF
      </Link>
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "secondary" })}
        >
          Open in WhatsApp
        </a>
      ) : (
        <span
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "cursor-not-allowed opacity-50",
          )}
          aria-disabled="true"
          title="Add a valid customer phone number to enable WhatsApp"
        >
          WhatsApp unavailable
        </span>
      )}
    </div>
  );
}
