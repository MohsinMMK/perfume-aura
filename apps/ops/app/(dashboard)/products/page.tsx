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
import { listProducts } from "@/lib/products";
import { safeDbQuery } from "@/lib/db-safe";
import { formatQty } from "@/lib/money";
import {
  CatalogEmptyState,
  DbUnavailableState,
} from "@/components/db-empty-state";
import { ProductFilters } from "@/components/products/product-filters";
import { hasOpsCapability } from "@/lib/ops-access";
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

function parseStatus(
  raw: string | undefined,
): "active" | "archived" | "all" {
  if (raw === "archived" || raw === "all") return raw;
  return "active";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireCapability("catalog.view", {
    redirectToLogin: true,
  });
  const canManageCommercials = hasOpsCapability(
    session.user.role,
    "catalog.manage-commercials",
  );
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = parseStatus(sp.status);
  const page = parsePage(sp.page);

  const result = await safeDbQuery(() => listProducts({ q, status, page }));
  if (result.data) {
    const canonical = canonicalPage(
      result.data.page,
      result.data.totalPages,
      result.data.total,
    );
    if (canonical) {
      redirect(
        paginationHref("/products", canonical, {
          q: q || undefined,
          status: status === "active" ? undefined : status,
        }),
      );
    }
  }

  const hasFilters = q.length > 0 || status !== "active";

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Products"
        description="Catalog of fragrances and sellable sizes."
        actions={
          canManageCommercials ? (
            <Button label="New product" href="/products/new" variant="primary" />
          ) : undefined
        }
      />

      <Suspense fallback={null}>
        <ProductFilters q={q} status={status} />
      </Suspense>

      {result.error || !result.data ? (
        <DbUnavailableState message={result.error ?? "No data returned."} />
      ) : result.data.items.length === 0 ? (
        hasFilters ? (
          <Card variant="muted">
            <EmptyState
              title="No products match your filters."
              actions={
                <Button label="Clear filters" href="/products" variant="secondary" />
              }
            />
          </Card>
        ) : (
          <CatalogEmptyState canCreate={canManageCommercials} />
        )
      ) : (
        <Card padding={0} className="overflow-hidden">
          <Table hasHover>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Brand</TableHeaderCell>
                <TableHeaderCell className="text-right">Variants</TableHeaderCell>
                <TableHeaderCell className="text-right">On hand</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <VStack gap={0.5}>
                      <Link
                        href={`/products/${p.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.category ? (
                        <Text type="supporting">{p.category}</Text>
                      ) : null}
                    </VStack>
                  </TableCell>
                  <TableCell>
                    <Text color="secondary">{p.brand ?? "—"}</Text>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQty(p.variantCount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQty(p.totalOnHand)}
                  </TableCell>
                  <TableCell>
                    <Token
                      size="sm"
                      label={p.status}
                      color={p.status === "active" ? "green" : "gray"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationNav
            pathname="/products"
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
