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
import { VStack } from "@astryxdesign/core/VStack";
import { listInvoices, getOpenArTotalCents } from "@/lib/invoices";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr } from "@/lib/money";
import { DbUnavailableState } from "@/components/db-empty-state";
import { formatBusinessDate } from "@/lib/business-date";
import { requireCapability } from "@/lib/session";
import {
  canonicalPage,
  paginationHref,
  parsePage,
} from "@/lib/pagination";
import { PaginationNav } from "@/components/pagination-nav";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function ArPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireCapability("finance.view", { redirectToLogin: true });
  const page = parsePage((await searchParams).page);

  const [listResult, totalResult] = await Promise.all([
    safeDbQuery(() => listInvoices({ status: "ar", page })),
    safeDbQuery(() => getOpenArTotalCents()),
  ]);

  const error = listResult.error ?? totalResult.error;
  const pageData = listResult.data;
  if (pageData) {
    const canonical = canonicalPage(
      pageData.page,
      pageData.totalPages,
      pageData.total,
    );
    if (canonical) redirect(paginationHref("/invoices/ar", canonical));
  }
  const rows = pageData?.items ?? [];
  const openAr = totalResult.data ?? 0;

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <VStack gap={2}>
        <Link
          href="/invoices"
          className="w-fit text-sm text-secondary underline-offset-4 hover:underline"
        >
          ← Invoices
        </Link>
        <PageHeader
          title="Accounts receivable"
          description="Issued invoices with unpaid balances."
        />
      </VStack>

      {error ? <DbUnavailableState message={error} /> : null}

      <Card>
        <VStack gap={1}>
          <Text type="supporting">Open AR</Text>
          <Text size="2xl" weight="semibold" hasTabularNumbers>
            {formatInr(openAr)}
          </Text>
        </VStack>
      </Card>

      {rows.length === 0 && !error ? (
        <Card variant="muted">
          <EmptyState
            title="No open AR"
            description="All issued invoices are paid or none issued yet."
          />
        </Card>
      ) : (
        <Card padding={0} className="overflow-hidden">
          <Table hasHover>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Invoice</TableHeaderCell>
                <TableHeaderCell>Customer</TableHeaderCell>
                <TableHeaderCell>Issued</TableHeaderCell>
                <TableHeaderCell className="text-right">Total</TableHeaderCell>
                <TableHeaderCell className="text-right">Balance</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {inv.number ?? inv.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>{inv.customerName}</TableCell>
                  <TableCell>
                    <Text color="secondary">
                      {inv.issueDate ? formatBusinessDate(inv.issueDate) : "—"}
                    </Text>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInr(inv.totalCents)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatInr(inv.balanceCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pageData ? (
            <PaginationNav
              pathname="/invoices/ar"
              page={pageData.page}
              totalPages={pageData.totalPages}
              total={pageData.total}
            />
          ) : null}
        </Card>
      )}
    </VStack>
  );
}
