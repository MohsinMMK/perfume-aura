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
import { formatQty } from "@/lib/money";
import {
  listActiveProductsForOilSelect,
  listOilBalances,
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
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireCapability("stock.view", {
    redirectToLogin: true,
  });
  const canReceive = hasOpsCapability(session.user.role, "stock.receive");
  const page = parsePage((await searchParams).page);

  const [productsResult, balancesResult, movementsResult] = await Promise.all([
    safeDbQuery(() => listActiveProductsForOilSelect()),
    safeDbQuery(() => listOilBalances()),
    safeDbQuery(() => listRecentOilMovements({ page })),
  ]);
  const dbError =
    productsResult.error ?? balancesResult.error ?? movementsResult.error;
  const products = productsResult.data ?? [];
  const balances = balancesResult.data ?? [];
  const movementPage = movementsResult.data;
  if (movementPage) {
    const canonical = canonicalPage(
      movementPage.page,
      movementPage.totalPages,
      movementPage.total,
    );
    if (canonical) redirect(paginationHref("/stock/oil", canonical));
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
          <div className="grid gap-6 lg:grid-cols-2">
            {canReceive ? <ReceiveOilForm products={products} /> : null}
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Perfume</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">Lots</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balances.map((row) => (
                        <TableRow key={row.productId}>
                          <TableCell>{row.productName}</TableCell>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Perfume</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {formatBusinessDateTime(row.createdAt)}
                        </TableCell>
                        <TableCell>{row.productName}</TableCell>
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
            />
          ) : null}
        </>
      )}
    </div>
  );
}
