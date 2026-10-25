import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
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
import { listInvoices } from "@/lib/invoices";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr } from "@/lib/money";
import { DbUnavailableState } from "@/components/db-empty-state";
import { hasOpsCapability } from "@/lib/ops-access";
import { requireCapability } from "@/lib/session";
import {
  canonicalPage,
  paginationHref,
  parsePage,
} from "@/lib/pagination";
import { PaginationNav } from "@/components/pagination-nav";
import { FilterTabs } from "@/components/navigation/filter-tabs";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; page?: string }>;

function parseStatus(
  raw: string | undefined,
): "draft" | "issued" | "paid" | "void" | "all" {
  if (
    raw === "draft" ||
    raw === "issued" ||
    raw === "paid" ||
    raw === "void"
  ) {
    return raw;
  }
  return "all";
}

function statusColor(s: string): "gray" | "blue" | "green" | "red" {
  switch (s) {
    case "issued":
      return "blue";
    case "paid":
      return "green";
    case "void":
      return "red";
    default:
      return "gray";
  }
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireCapability("invoices.view", {
    redirectToLogin: true,
  });
  const canDraft = hasOpsCapability(session.user.role, "invoices.draft");
  const canViewFinance = hasOpsCapability(session.user.role, "finance.view");
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const page = parsePage(sp.page);
  const result = await safeDbQuery(() => listInvoices({ status, page }));
  if (result.data) {
    const canonical = canonicalPage(
      result.data.page,
      result.data.totalPages,
      result.data.total,
    );
    if (canonical) {
      redirect(
        paginationHref("/invoices", canonical, {
          status: status === "all" ? undefined : status,
        }),
      );
    }
  }

  const filters = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "issued", label: "Issued" },
    { key: "paid", label: "Paid" },
    { key: "void", label: "Void" },
  ] as const;

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Invoices"
        description="Draft → issue → paid/void. Stock moves only on fulfill."
        actions={
          canDraft ? (
            <Button label="New invoice" href="/invoices/new" variant="primary" />
          ) : null
        }
      />

      <HStack gap={4} vAlign="end" justify="between" wrap="wrap">
        <FilterTabs
          label="Invoice status"
          value={status}
          tabs={filters.map((f) => ({
            value: f.key,
            label: f.label,
            href: f.key === "all" ? "/invoices" : `/invoices?status=${f.key}`,
          }))}
        />
        {canViewFinance ? (
          <Button label="AR list" href="/invoices/ar" variant="ghost" size="sm" />
        ) : null}
      </HStack>

      {result.error || !result.data ? (
        <DbUnavailableState message={result.error ?? "No data"} />
      ) : result.data.items.length === 0 ? (
        <Card variant="muted">
          <EmptyState
            title="No invoices"
            description={
              status === "all"
                ? "Draft an invoice to bill a customer."
                : "No invoices match this status."
            }
            actions={
              canDraft ? (
                <Button
                  label="Create a draft"
                  href="/invoices/new"
                  variant="primary"
                />
              ) : null
            }
          />
        </Card>
      ) : (
        <Card padding={0} className="overflow-hidden">
          <Table hasHover>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Number</TableHeaderCell>
                <TableHeaderCell>Customer</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="text-right">Total</TableHeaderCell>
                <TableHeaderCell className="text-right">Balance</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.items.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {inv.number ?? "Draft"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Text color="secondary">{inv.customerName}</Text>
                  </TableCell>
                  <TableCell>
                    <Token
                      size="sm"
                      label={inv.status}
                      color={statusColor(inv.status)}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInr(inv.totalCents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInr(inv.balanceCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationNav
            pathname="/invoices"
            page={result.data.page}
            totalPages={result.data.totalPages}
            total={result.data.total}
            search={{ status: status === "all" ? undefined : status }}
          />
        </Card>
      )}
    </VStack>
  );
}
