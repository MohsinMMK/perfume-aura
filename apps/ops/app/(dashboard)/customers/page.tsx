import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@astryxdesign/core/Button";
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
import { listCustomers } from "@/lib/customers";
import { safeDbQuery } from "@/lib/db-safe";
import { ProductFilters } from "@/components/products/product-filters";
import { DbUnavailableState } from "@/components/db-empty-state";
import { requireCapability } from "@/lib/session";
import {
  canonicalPage,
  paginationHref,
  parsePage,
} from "@/lib/pagination";
import { PaginationNav } from "@/components/pagination-nav";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; status?: string; page?: string }>;

function parseStatus(raw: string | undefined): "active" | "archived" | "all" {
  if (raw === "archived" || raw === "all") return raw;
  return "active";
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireCapability("customers.view", { redirectToLogin: true });
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = parseStatus(sp.status);
  const page = parsePage(sp.page);
  const result = await safeDbQuery(() => listCustomers({ q, status, page }));
  if (result.data) {
    const canonical = canonicalPage(
      result.data.page,
      result.data.totalPages,
      result.data.total,
    );
    if (canonical) {
      redirect(
        paginationHref("/customers", canonical, {
          q: q || undefined,
          status: status === "active" ? undefined : status,
        }),
      );
    }
  }

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Customers"
        description="Contacts for invoices and AR."
        actions={
          <Button label="New customer" href="/customers/new" variant="primary" />
        }
      />

      <Suspense fallback={null}>
        <ProductFilters
          q={q}
          status={status}
          searchPlaceholder="Search name, email, phone, city…"
          searchLabel="Search customers"
        />
      </Suspense>

      {result.error || !result.data ? (
        <DbUnavailableState message={result.error ?? "No data"} />
      ) : result.data.items.length === 0 ? (
        <Card variant="muted">
          <EmptyState
            title="No customers yet"
            description="Add a customer to raise invoices against them."
            actions={
              <Button label="Add customer" href="/customers/new" variant="primary" />
            }
          />
        </Card>
      ) : (
        <Card padding={0} className="overflow-hidden">
          <Table hasHover>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Phone</TableHeaderCell>
                <TableHeaderCell>City</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <VStack gap={0.5}>
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.email ? (
                        <Text type="supporting">{c.email}</Text>
                      ) : null}
                    </VStack>
                  </TableCell>
                  <TableCell>
                    <Text color="secondary">{c.phone ?? "—"}</Text>
                  </TableCell>
                  <TableCell>
                    <Text color="secondary">{c.city ?? "—"}</Text>
                  </TableCell>
                  <TableCell>
                    <Token
                      size="sm"
                      label={c.status}
                      color={c.status === "active" ? "green" : "gray"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationNav
            pathname="/customers"
            page={result.data.page}
            totalPages={result.data.totalPages}
            total={result.data.total}
            search={{
              q: q || undefined,
              status: status === "active" ? undefined : status,
            }}
          />
        </Card>
      )}
    </VStack>
  );
}
