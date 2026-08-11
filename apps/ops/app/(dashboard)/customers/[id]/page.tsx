import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@perfume-aura/ui/components/badge";
import { buttonVariants } from "@perfume-aura/ui/components/button";
import { getCustomer } from "@/lib/customers";
import { safeDbQuery } from "@/lib/db-safe";
import { CustomerForm } from "@/components/customers/customer-form";
import { ArchiveCustomerButton } from "@/components/customers/archive-customer-button";
import { DbUnavailableState } from "@/components/db-empty-state";
import { requireCapability } from "@/lib/session";
import { hasOpsCapability } from "@/lib/ops-access";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCapability("customers.view", {
    redirectToLogin: true,
  });
  const { id } = await params;
  const result = await safeDbQuery(() => getCustomer(id));

  if (result.error) {
    return <DbUnavailableState message={result.error} />;
  }
  if (!result.data) notFound();

  const c = result.data;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/customers"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Customers
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
            {c.name}
          </h1>
          <div className="mt-2">
            <Badge variant={c.status === "active" ? "secondary" : "outline"}>
              {c.status}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/invoices/new?customerId=${c.id}`}
            className={buttonVariants()}
          >
            New invoice
          </Link>
          {c.status === "active" &&
          hasOpsCapability(session.user.role, "customers.archive") ? (
            <ArchiveCustomerButton customerId={c.id} />
          ) : null}
        </div>
      </div>

      <CustomerForm
        mode="edit"
        customerId={c.id}
        defaults={{
          name: c.name,
          email: c.email ?? "",
          phone: c.phone ?? "",
          addressLine: c.addressLine ?? "",
          city: c.city ?? "",
          notes: c.notes ?? "",
        }}
      />
    </div>
  );
}
