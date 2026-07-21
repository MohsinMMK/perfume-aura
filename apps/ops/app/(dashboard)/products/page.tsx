import Link from "next/link";
import { Suspense } from "react";
import {
  Card,
  CardContent,
} from "@perfume-aura/ui/components/card";
import { Badge } from "@perfume-aura/ui/components/badge";
import { buttonVariants } from "@perfume-aura/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@perfume-aura/ui/components/table";
import { cn } from "@perfume-aura/ui/lib/utils";
import { listProducts } from "@/lib/products";
import { safeDbQuery } from "@/lib/db-safe";
import { formatQty } from "@/lib/money";
import {
  CatalogEmptyState,
  DbUnavailableState,
} from "@/components/db-empty-state";
import { ProductFilters } from "@/components/products/product-filters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; status?: string }>;

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
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = parseStatus(sp.status);

  const result = await safeDbQuery(() => listProducts({ q, status }));

  const hasFilters = q.length > 0 || status !== "active";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Products
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catalog of fragrances and sellable sizes.
          </p>
        </div>
        <Link
          href="/products/new"
          className={cn(buttonVariants(), "w-full sm:w-auto")}
        >
          New product
        </Link>
      </div>

      <Suspense fallback={null}>
        <ProductFilters q={q} status={status} />
      </Suspense>

      {result.error || !result.data ? (
        <DbUnavailableState message={result.error ?? "No data returned."} />
      ) : result.data.length === 0 ? (
        hasFilters ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No products match your filters.{" "}
              <Link
                href="/products"
                className="underline-offset-4 hover:underline"
              >
                Clear filters
              </Link>
            </CardContent>
          </Card>
        ) : (
          <CatalogEmptyState />
        )
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Variants</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/products/${p.id}`}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.category ? (
                        <p className="text-xs text-muted-foreground">
                          {p.category}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.brand ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(p.variantCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(p.totalOnHand)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "active" ? "secondary" : "outline"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
