import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import { Badge } from "@perfume-aura/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@perfume-aura/ui/components/table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@perfume-aura/ui/components/empty";
import { listActiveVariantsForStockSelect } from "@/lib/products";
import { listRecentMovements } from "@/lib/stock";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr, formatQty } from "@/lib/money";
import { ReceiveStockForm } from "@/components/stock/receive-stock-form";
import { AdjustStockForm } from "@/components/stock/adjust-stock-form";
import { DbUnavailableState } from "@/components/db-empty-state";
import { formatBusinessDateTime } from "@/lib/business-date";
import { hasOpsCapability } from "@/lib/ops-access";
import { requireCapability } from "@/lib/session";
import {
  canonicalPage,
  paginationHref,
  parsePage,
} from "@/lib/pagination";
import { PaginationNav } from "@/components/pagination-nav";

export const dynamic = "force-dynamic";

function typeBadgeVariant(
  type: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "receive":
    case "return":
      return "secondary";
    case "sale":
    case "damage":
      return "destructive";
    default:
      return "outline";
  }
}

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireCapability("stock.view", {
    redirectToLogin: true,
  });
  const canAdjustStock = hasOpsCapability(session.user.role, "stock.adjust");
  const canViewCost = hasOpsCapability(session.user.role, "stock.view-cost");
  const page = parsePage((await searchParams).page);

  // Independent loaders — parallelize (vercel-react-best-practices: async-parallel)
  const [variantsResult, movementsResult] = await Promise.all([
    safeDbQuery(() => listActiveVariantsForStockSelect()),
    safeDbQuery(() => listRecentMovements({ page })),
  ]);

  const dbError = variantsResult.error ?? movementsResult.error;
  const variants = variantsResult.data ?? [];
  const movementPage = movementsResult.data;
  if (movementPage) {
    const canonical = canonicalPage(
      movementPage.page,
      movementPage.totalPages,
      movementPage.total,
    );
    if (canonical) redirect(paginationHref("/stock", canonical));
  }
  const movements = movementPage?.items ?? [];

  const variantOptions = variants.map((v) => ({
    id: v.id,
    label: v.label,
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Receive inventory and review the movement ledger.
          </p>
        </div>
        <Link
          href="/stock/low"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          View low stock →
        </Link>
      </div>

      {dbError ? (
        <DbUnavailableState message={dbError} />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <ReceiveStockForm variants={variantOptions} />
            {canAdjustStock ? <AdjustStockForm variants={variantOptions} /> : null}
          </div>

          <Card className="overflow-hidden py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Recent movements</CardTitle>
              <CardDescription>
                Paged ledger entries across all movement types.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {movements.length === 0 ? (
                <Empty className="rounded-none border-0 py-10">
                  <EmptyHeader>
                    <EmptyTitle>No movements yet</EmptyTitle>
                    <EmptyDescription>
                      Receive stock to create the first ledger entry.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Product / SKU</TableHead>
                      <TableHead className="text-right">Delta</TableHead>
                      <TableHead className="text-right">After</TableHead>
                      {canViewCost ? <TableHead>Cost basis</TableHead> : null}
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatBusinessDateTime(m.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeBadgeVariant(m.type)}>
                            {m.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{m.productName}</span>
                          <p className="text-xs text-muted-foreground">
                            {m.sku} · {m.sizeMl} ml
                          </p>
                        </TableCell>
                        <TableCell
                          className={
                            m.quantityDelta >= 0
                              ? "text-right tabular-nums text-foreground"
                              : "text-right tabular-nums text-destructive"
                          }
                        >
                          {m.quantityDelta > 0 ? "+" : ""}
                          {formatQty(m.quantityDelta)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(m.quantityAfter)}
                        </TableCell>
                        {canViewCost ? (
                          <TableCell className="whitespace-nowrap text-xs">
                            {m.costBasis === "snapshot" &&
                            m.unitCostCents !== null ? (
                              <span>
                                Captured · {formatInr(m.unitCostCents)}
                              </span>
                            ) : m.costBasis === "legacy_current" &&
                              m.unitCostCents !== null ? (
                              <span className="text-muted-foreground">
                                Legacy estimate · {formatInr(m.unitCostCents)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        ) : null}
                        <TableCell className="max-w-[12rem] truncate text-muted-foreground">
                          {m.note ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {movementPage ? (
              <PaginationNav
                pathname="/stock"
                page={movementPage.page}
                totalPages={movementPage.totalPages}
                total={movementPage.total}
              />
            ) : null}
          </Card>
        </>
      )}
    </div>
  );
}
