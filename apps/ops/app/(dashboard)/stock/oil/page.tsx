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
import { ReceiveOilForm } from "@/components/stock/receive-oil-form";
import { DbUnavailableState } from "@/components/db-empty-state";
import { PaginationNav } from "@/components/pagination-nav";
import { formatBusinessDateTime } from "@/lib/business-date";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr, formatQty } from "@/lib/money";
import {
  listActiveProductsForOilSelect,
  listOilBalances,
  listOilLots,
  listRecentOilMovements,
} from "@/lib/oil";
import { hasOpsCapability } from "@/lib/ops-access";
import {
  canonicalPage,
  paginationHref,
  parsePage,
} from "@/lib/pagination";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OilStockPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; lotsPage?: string }>;
}) {
  const session = await requireCapability("stock.view", {
    redirectToLogin: true,
  });
  const canReceive = hasOpsCapability(session.user.role, "stock.receive");
  const canViewCost = hasOpsCapability(session.user.role, "stock.view-cost");
  const resolvedSearch = await searchParams;
  const page = parsePage(resolvedSearch.page);
  const lotsPage = parsePage(resolvedSearch.lotsPage);

  const [productsResult, balancesResult, lotsResult, movementsResult] =
    await Promise.all([
      safeDbQuery(() => listActiveProductsForOilSelect()),
      safeDbQuery(() => listOilBalances()),
      safeDbQuery(() => listOilLots({ page: lotsPage })),
      safeDbQuery(() => listRecentOilMovements({ page })),
    ]);
  const dbError =
    productsResult.error ??
    balancesResult.error ??
    lotsResult.error ??
    movementsResult.error;
  const products = productsResult.data ?? [];
  const balances = balancesResult.data ?? [];
  const lotPage = lotsResult.data;
  const lots = lotPage?.items ?? [];
  const movementPage = movementsResult.data;
  if (lotPage) {
    const canonical = canonicalPage(
      lotPage.page,
      lotPage.totalPages,
      lotPage.total,
    );
    if (canonical) {
      redirect(
        paginationHref("/stock/oil", canonical, resolvedSearch, "lotsPage"),
      );
    }
  }
  if (movementPage) {
    const canonical = canonicalPage(
      movementPage.page,
      movementPage.totalPages,
      movementPage.total,
    );
    if (canonical) {
      redirect(paginationHref("/stock/oil", canonical, resolvedSearch));
    }
  }
  const movements = movementPage?.items ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Oil stock</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            1 kg bottle = 1000 ml. Every perfume uses 50% oil.
          </p>
        </div>
        <Link
          href="/stock"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Finished bottles
        </Link>
      </div>

      {dbError ? (
        <DbUnavailableState message={dbError} />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
            {canReceive ? (
              <ReceiveOilForm products={products} canViewCost={canViewCost} />
            ) : null}
            <Card className="overflow-hidden py-0">
              <CardHeader className="border-b py-4">
                <CardTitle>Remaining oil</CardTitle>
                <CardDescription>
                  Sum of open lots per perfume, in millilitres.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {balances.length === 0 ? (
                  <Empty className="border-0">
                    <EmptyHeader>
                      <EmptyTitle>No oil received yet</EmptyTitle>
                      <EmptyDescription>
                        Receive a 1 kg bottle before recording a sale.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Perfume</TableHead>
                        <TableHead className="w-24 text-right">Remaining</TableHead>
                        <TableHead className="w-16 text-right">Lots</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balances.map((row) => (
                        <TableRow key={row.productId}>
                          <TableCell className="truncate" title={row.productName}>
                            {row.productName}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatQty(row.remainingMl)} ml
                          </TableCell>
                          <TableCell className="text-right">
                            {formatQty(row.lotCount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Purchase lots</CardTitle>
              <CardDescription>
                Supplier, purchase reference, and remaining oil for every receipt.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {lots.length === 0 ? (
                <Empty className="border-0">
                  <EmptyHeader>
                    <EmptyTitle>No purchase lots</EmptyTitle>
                    <EmptyDescription>
                      Supplier and cost details appear after the first oil receipt.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Received</TableHead>
                      <TableHead>Perfume</TableHead>
                      <TableHead className="w-48">Supplier / reference</TableHead>
                      <TableHead className="w-24 text-right">Received</TableHead>
                      <TableHead className="w-24 text-right">Remaining</TableHead>
                      {canViewCost ? (
                        <TableHead className="w-24 text-right">Cost</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lots.map((lot) => (
                      <TableRow key={lot.id}>
                        <TableCell className="truncate" title={lot.receivedDate ?? formatBusinessDateTime(lot.createdAt)}>
                          {lot.receivedDate
                            ? lot.receivedDate
                            : formatBusinessDateTime(lot.createdAt)}
                        </TableCell>
                        <TableCell className="truncate font-medium" title={lot.productName}>
                          {lot.productName}
                        </TableCell>
                        <TableCell className="truncate" title={lot.supplierReference ?? lot.supplierName ?? undefined}>
                          {lot.supplierName ?? "—"}
                          {lot.supplierReference ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {lot.supplierReference}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(lot.receivedQuantityMl)} ml
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(lot.remainingQuantityMl)} ml
                        </TableCell>
                        {canViewCost ? (
                          <TableCell className="text-right tabular-nums">
                            {lot.totalCostCents === null
                              ? "—"
                              : formatInr(lot.totalCostCents)}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {lotPage ? (
              <PaginationNav
                pathname="/stock/oil"
                page={lotPage.page}
                totalPages={lotPage.totalPages}
                total={lotPage.total}
                search={resolvedSearch}
                pageParam="lotsPage"
              />
            ) : null}
          </Card>

          <Card className="overflow-hidden py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Oil movements</CardTitle>
              <CardDescription>Append-only concentrate ledger.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {movements.length === 0 ? (
                <Empty className="border-0">
                  <EmptyHeader>
                    <EmptyTitle>No oil movements</EmptyTitle>
                    <EmptyDescription>
                      Receives and sales will appear here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-44">When</TableHead>
                      <TableHead>Perfume</TableHead>
                      <TableHead className="w-24">Type</TableHead>
                      <TableHead className="w-24 text-right">Change</TableHead>
                      <TableHead className="w-24 text-right">After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="truncate" title={formatBusinessDateTime(row.createdAt)}>
                          {formatBusinessDateTime(row.createdAt)}
                        </TableCell>
                        <TableCell className="truncate" title={row.productName}>
                          {row.productName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.type === "sale" ? "destructive" : "secondary"
                            }
                          >
                            {row.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {row.quantityDeltaMl > 0 ? "+" : ""}
                          {formatQty(row.quantityDeltaMl)} ml
                        </TableCell>
                        <TableCell className="text-right">
                          {formatQty(row.quantityAfterMl)} ml
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {movementPage ? (
            <PaginationNav
              pathname="/stock/oil"
              page={movementPage.page}
              totalPages={movementPage.totalPages}
              total={movementPage.total}
              search={resolvedSearch}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
