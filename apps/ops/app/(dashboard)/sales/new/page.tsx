import Link from "next/link";
import { SaleWizard } from "@/components/sales/sale-wizard";
import { DbUnavailableState } from "@/components/db-empty-state";
import { listActiveCustomersForSelect } from "@/lib/customers";
import { safeDbQuery } from "@/lib/db-safe";
import { hasOpsCapability } from "@/lib/ops-access";
import { listSaleCatalog } from "@/lib/sales";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const session = await requireCapability("sales.complete", {
    redirectToLogin: true,
  });

  const [customersResult, catalogResult] = await Promise.all([
    safeDbQuery(() => listActiveCustomersForSelect()),
    safeDbQuery(() => listSaleCatalog()),
  ]);

  if (customersResult.error || catalogResult.error) {
    return (
      <DbUnavailableState
        message={customersResult.error ?? catalogResult.error ?? "No data"}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <Link
        href="/invoices"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Invoices
      </Link>
      <SaleWizard
        customers={customersResult.data ?? []}
        catalog={catalogResult.data ?? []}
        canRecordPayment={hasOpsCapability(session.user.role, "payments.record")}
      />
    </div>
  );
}
