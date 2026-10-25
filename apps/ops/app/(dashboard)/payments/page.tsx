import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
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
import { listPayments } from "@/lib/payments";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr } from "@/lib/money";
import { DbUnavailableState } from "@/components/db-empty-state";
import { formatBusinessDateTime } from "@/lib/business-date";
import { requireCapability } from "@/lib/session";
import {
  canonicalPage,
  paginationHref,
  parsePage,
} from "@/lib/pagination";
import { PaginationNav } from "@/components/pagination-nav";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

function methodLabel(m: string) {
  switch (m) {
    case "bank_transfer":
      return "Bank";
    case "card":
      return "Card";
    case "other":
      return "Other";
    default:
      return "Cash";
  }
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireCapability("payments.record", { redirectToLogin: true });
  const page = parsePage((await searchParams).page);

  const result = await safeDbQuery(() => listPayments({ page }));
  if (result.data) {
    const canonical = canonicalPage(
      result.data.page,
      result.data.totalPages,
      result.data.total,
    );
    if (canonical) redirect(paginationHref("/payments", canonical));
  }

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Payments"
        description="Manual receipts against invoices. Never changes stock."
      />

      {result.error || !result.data ? (
        <DbUnavailableState message={result.error ?? "No data"} />
      ) : result.data.items.length === 0 ? (
        <Card variant="muted">
          <EmptyState
            title="No payments yet"
            description="Record one from an issued invoice."
          />
        </Card>
      ) : (
        <Card padding={0} className="overflow-hidden">
          <Table hasHover>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Number</TableHeaderCell>
                <TableHeaderCell>Invoice</TableHeaderCell>
                <TableHeaderCell>Customer</TableHeaderCell>
                <TableHeaderCell>Method</TableHeaderCell>
                <TableHeaderCell>When</TableHeaderCell>
                <TableHeaderCell className="text-right">Amount</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.number ?? p.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/invoices/${p.invoiceId}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {p.invoiceNumber ?? "Invoice"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Text color="secondary">{p.customerName ?? "—"}</Text>
                  </TableCell>
                  <TableCell>
                    <Token size="sm" label={methodLabel(p.method)} color="gray" />
                  </TableCell>
                  <TableCell>
                    <Text type="supporting">
                      {formatBusinessDateTime(p.paidAt)}
                    </Text>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInr(p.amountCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationNav
            pathname="/payments"
            page={result.data.page}
            totalPages={result.data.totalPages}
            total={result.data.total}
          />
        </Card>
      )}
    </VStack>
  );
}
