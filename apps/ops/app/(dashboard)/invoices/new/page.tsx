import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/VStack";
import { listActiveCustomersForSelect } from "@/lib/customers";
import { safeDbQuery } from "@/lib/db-safe";
import { CreateInvoiceForm } from "@/components/invoices/create-invoice-form";
import { DbUnavailableState } from "@/components/db-empty-state";
import { PageHeader } from "@/components/page-header";
import { requireCapability } from "@/lib/session";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  await requireCapability("invoices.draft", { redirectToLogin: true });
  const { customerId } = await searchParams;

  const result = await safeDbQuery(() => listActiveCustomersForSelect());

  if (result.error || !result.data) {
    return <DbUnavailableState message={result.error ?? "No data"} />;
  }

  return (
    <VStack gap={4} className="mx-auto w-full max-w-6xl">
      <PageBreadcrumbs
        items={[{ label: "Invoices", href: "/invoices" }, { label: "New draft" }]}
      />
      {result.data.length === 0 ? (
        <>
          <PageHeader title="New invoice draft" />
          <Card variant="muted">
            <EmptyState
              title="No customers yet"
              description="Create a customer first, then draft an invoice for them."
              actions={
                <Button
                  label="New customer"
                  href="/customers/new"
                  variant="primary"
                />
              }
            />
          </Card>
        </>
      ) : (
        <CreateInvoiceForm
          customers={result.data}
          initialCustomerId={customerId}
        />
      )}
    </VStack>
  );
}
