import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@perfume-aura/ui/components/badge";
import { buttonVariants } from "@perfume-aura/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@perfume-aura/ui/components/table";
import { getCustomer, getCustomerOverview } from "@/lib/customers";
import { safeDbQuery } from "@/lib/db-safe";
import { CustomerForm } from "@/components/customers/customer-form";
import { ArchiveCustomerButton } from "@/components/customers/archive-customer-button";
import { DbUnavailableState } from "@/components/db-empty-state";
import { requireCapability } from "@/lib/session";
import { hasOpsCapability } from "@/lib/ops-access";
import { formatInr, formatQty } from "@/lib/money";
import { formatBusinessDateTime } from "@/lib/business-date";

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
  const [result, overviewResult] = await Promise.all([
    safeDbQuery(() => getCustomer(id)),
    safeDbQuery(() => getCustomerOverview(id)),
  ]);

  if (result.error) {
    return <DbUnavailableState message={result.error} />;
  }
  if (!result.data) notFound();

  const c = result.data;
  const overview = overviewResult.data;

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

      {overviewResult.error ? (
        <DbUnavailableState message={overviewResult.error} />
      ) : overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Purchases", formatQty(overview.invoiceCount), "Issued and paid"],
              ["Lifetime sales", formatInr(overview.lifetimeValueCents), "Issued and paid"],
              ["Payments", formatInr(overview.amountPaidCents), "Recorded receipts"],
              ["Outstanding", formatInr(overview.openBalanceCents), "Open invoice balance"],
            ].map(([label, value, hint]) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardDescription>{label}</CardDescription>
                  <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {hint}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card className="overflow-hidden py-0">
              <CardHeader className="border-b py-4">
                <CardTitle>Purchase history</CardTitle>
                <CardDescription>
                  {overview.lastPurchaseAt
                    ? `Last purchase ${formatBusinessDateTime(overview.lastPurchaseAt)}`
                    : "No completed purchase yet"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No invoices for this customer.
                        </TableCell>
                      </TableRow>
                    ) : (
                      overview.invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                              {invoice.number ?? "Draft"}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {formatBusinessDateTime(invoice.createdAt)}
                            </p>
                          </TableCell>
                          <TableCell><Badge variant="secondary">{invoice.status}</Badge></TableCell>
                          <TableCell className="text-right tabular-nums">{formatInr(invoice.totalCents)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatInr(invoice.balanceCents)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="overflow-hidden py-0">
              <CardHeader className="border-b py-4">
                <CardTitle>Most purchased</CardTitle>
                <CardDescription>Products ranked by bottle quantity.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-20 text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.favoriteProducts.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No purchase data.</TableCell></TableRow>
                    ) : overview.favoriteProducts.map((product) => (
                      <TableRow key={product.description}>
                        <TableCell className="min-w-0">
                          <p className="truncate" title={product.description}>
                            {product.description}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatInr(product.spentCents)}</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatQty(product.quantity)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

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
