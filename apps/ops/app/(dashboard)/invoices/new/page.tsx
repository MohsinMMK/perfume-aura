import Link from "next/link";
import { listActiveCustomersForSelect } from "@/lib/customers";
import { safeDbQuery } from "@/lib/db-safe";
import { CreateInvoiceForm } from "@/components/invoices/create-invoice-form";
import { DbUnavailableState } from "@/components/db-empty-state";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const result = await safeDbQuery(() => listActiveCustomersForSelect());

  if (result.error || !result.data) {
    return <DbUnavailableState message={result.error ?? "No data"} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <Link
        href="/invoices"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Invoices
      </Link>
      {result.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Create a{" "}
          <Link href="/customers/new" className="underline-offset-4 hover:underline">
            customer
          </Link>{" "}
          first.
        </p>
      ) : (
        <CreateInvoiceForm customers={result.data} />
      )}
    </div>
  );
}
