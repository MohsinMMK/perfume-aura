import { VStack } from "@astryxdesign/core/VStack";
import { SaleWizard } from "@/components/sales/sale-wizard";
import { DbUnavailableState } from "@/components/db-empty-state";
import { listActiveCustomersForSelect } from "@/lib/customers";
import { safeDbQuery } from "@/lib/db-safe";
import { hasOpsCapability } from "@/lib/ops-access";
import { listSaleCatalog } from "@/lib/sales";
import { requireCapability } from "@/lib/session";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";

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
    <VStack gap={4} className="mx-auto w-full max-w-6xl">
      <PageBreadcrumbs
        items={[{ label: "Invoices", href: "/invoices" }, { label: "New sale" }]}
      />
      <SaleWizard
        customers={customersResult.data ?? []}
        catalog={catalogResult.data ?? []}
        canRecordPayment={hasOpsCapability(session.user.role, "payments.record")}
      />
    </VStack>
  );
}
