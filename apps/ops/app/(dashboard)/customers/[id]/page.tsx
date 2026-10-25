import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { getCustomer, getCustomerOverview } from "@/lib/customers";
import { safeDbQuery } from "@/lib/db-safe";
import { CustomerForm } from "@/components/customers/customer-form";
import { ArchiveCustomerButton } from "@/components/customers/archive-customer-button";
import { DbUnavailableState } from "@/components/db-empty-state";
import { PageHeader } from "@/components/page-header";
import { requireCapability } from "@/lib/session";
import { hasOpsCapability } from "@/lib/ops-access";
import { formatInr, formatQty } from "@/lib/money";
import { formatBusinessDateTime } from "@/lib/business-date";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";

export const dynamic = "force-dynamic";

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <VStack gap={1} padding={4} className="border-b border-border">
      <Heading level={2}>{title}</Heading>
      <Text color="secondary">{description}</Text>
    </VStack>
  );
}

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
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <VStack gap={2}>
        <PageBreadcrumbs
          items={[{ label: "Customers", href: "/customers" }, { label: c.name }]}
        />
        <PageHeader
          title={c.name}
          actions={
            <>
              <Button
                label="New invoice"
                variant="primary"
                href={`/invoices/new?customerId=${c.id}`}
              />
              {c.status === "active" &&
              hasOpsCapability(session.user.role, "customers.archive") ? (
                <ArchiveCustomerButton customerId={c.id} />
              ) : null}
            </>
          }
        />
        <div>
          <Token
            size="sm"
            label={c.status}
            color={c.status === "active" ? "green" : "gray"}
          />
        </div>
      </VStack>

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
                <VStack gap={1}>
                  <Text type="supporting">{label}</Text>
                  <Text size="xl" weight="semibold" className="tabular-nums">
                    {value}
                  </Text>
                  <Text type="supporting">{hint}</Text>
                </VStack>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
            <Card padding={0} className="overflow-hidden">
              <SectionHeader
                title="Purchase history"
                description={
                  overview.lastPurchaseAt
                    ? `Last purchase ${formatBusinessDateTime(overview.lastPurchaseAt)}`
                    : "No completed purchase yet"
                }
              />
              <Table hasHover>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Invoice</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell className="text-right">Total</TableHeaderCell>
                    <TableHeaderCell className="text-right">Balance</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-secondary">
                        No invoices for this customer.
                      </TableCell>
                    </TableRow>
                  ) : (
                    overview.invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <VStack gap={0.5}>
                            <Link
                              href={`/invoices/${invoice.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {invoice.number ?? "Draft"}
                            </Link>
                            <Text type="supporting">
                              {formatBusinessDateTime(invoice.createdAt)}
                            </Text>
                          </VStack>
                        </TableCell>
                        <TableCell>
                          <Token size="sm" label={invoice.status} color="gray" />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatInr(invoice.totalCents)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatInr(invoice.balanceCents)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            <Card padding={0} className="overflow-hidden">
              <SectionHeader
                title="Most purchased"
                description="Products ranked by bottle quantity."
              />
              <Table hasHover>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Product</TableHeaderCell>
                    <TableHeaderCell className="w-20 text-right">Qty</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.favoriteProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-secondary">
                        No purchase data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    overview.favoriteProducts.map((product) => (
                      <TableRow key={product.description}>
                        <TableCell className="min-w-0">
                          <VStack gap={0.5}>
                            <span
                              className="block truncate"
                              title={product.description}
                            >
                              {product.description}
                            </span>
                            <Text type="supporting">
                              {formatInr(product.spentCents)}
                            </Text>
                          </VStack>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(product.quantity)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
    </VStack>
  );
}
