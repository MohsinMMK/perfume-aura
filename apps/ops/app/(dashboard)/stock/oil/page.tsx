import { redirect } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  // Aliased so lib/oil-cost-access.test.ts can match the cost column header.
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { ReceiveOilForm } from "@/components/stock/receive-oil-form";
import { DbUnavailableState } from "@/components/db-empty-state";
import { PageHeader } from "@/components/page-header";
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
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Oil stock"
        description="1 kg / 1 L bottle = 1000 ml. Each series sets how much oil a bottle uses; the rest is base mixture."
        actions={
          <Button label="Finished bottles" href="/stock" variant="secondary" />
        }
      />

      {dbError ? (
        <DbUnavailableState message={dbError} />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
            {canReceive ? (
              <ReceiveOilForm products={products} canViewCost={canViewCost} />
            ) : null}
            <Card padding={0} className="overflow-hidden">
              <SectionHeader
                title="Available oil"
                description="Raw oil available after active storefront holds, in millilitres."
              />
              {balances.length === 0 ? (
                <EmptyState
                  title="No oil received yet"
                  description="Receive a 1 kg bottle before recording a sale."
                />
              ) : (
                <Table hasHover textOverflow="truncate">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell className="min-w-40">Perfume</TableHeaderCell>
                      <TableHeaderCell className="w-24 min-w-24 text-right">Available</TableHeaderCell>
                      <TableHeaderCell className="w-20 min-w-20 text-right">Held</TableHeaderCell>
                      <TableHeaderCell className="w-16 min-w-16 text-right">Lots</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balances.map((row) => (
                      <TableRow key={row.productId}>
                        <TableCell>
                          <span className="block truncate" title={row.productName}>
                            {row.productName}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(row.availableMl)} ml
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(row.reservedMl)} ml
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(row.lotCount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>

          <Card padding={0} className="overflow-hidden">
            <SectionHeader
              title="Purchase lots"
              description="Supplier, purchase reference, physical remaining oil, and active storefront holds for every receipt."
            />
            {lots.length === 0 ? (
              <EmptyState
                title="No purchase lots"
                description="Supplier and cost details appear after the first oil receipt."
              />
            ) : (
              <Table hasHover textOverflow="truncate">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell className="w-40 min-w-40">Received</TableHeaderCell>
                    <TableHeaderCell className="min-w-40">Perfume</TableHeaderCell>
                    <TableHeaderCell className="w-48 min-w-48">Supplier / reference</TableHeaderCell>
                    <TableHeaderCell className="w-24 min-w-24 text-right">Received</TableHeaderCell>
                    <TableHeaderCell className="w-24 min-w-24 text-right">Remaining</TableHeaderCell>
                    <TableHeaderCell className="w-20 min-w-20 text-right">Held</TableHeaderCell>
                    <TableHeaderCell className="w-24 min-w-24 text-right">Available</TableHeaderCell>
                    {canViewCost ? (
                      <TableHeaderCell className="w-24 min-w-24 text-right">Cost</TableHeaderCell>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lots.map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell>
                        <span
                          className="block truncate"
                          title={
                            lot.receivedDate ??
                            formatBusinessDateTime(lot.createdAt)
                          }
                        >
                          {lot.receivedDate
                            ? lot.receivedDate
                            : formatBusinessDateTime(lot.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="block truncate" title={lot.productName}>
                          {lot.productName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex min-w-0 flex-col gap-0.5"
                          title={
                            lot.supplierReference ?? lot.supplierName ?? undefined
                          }
                        >
                          <Text maxLines={1}>{lot.supplierName ?? "—"}</Text>
                          {lot.supplierReference ? (
                            <Text type="supporting" maxLines={1}>
                              {lot.supplierReference}
                            </Text>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(lot.receivedQuantityMl)} ml
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(lot.remainingQuantityMl)} ml
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(lot.reservedQuantityMl)} ml
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(lot.availableQuantityMl)} ml
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

          <Card padding={0} className="overflow-hidden">
            <SectionHeader
              title="Oil movements"
              description="Append-only concentrate ledger."
            />
            {movements.length === 0 ? (
              <EmptyState
                title="No oil movements"
                description="Receives and sales will appear here."
              />
            ) : (
              <Table hasHover textOverflow="truncate">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell className="w-44 min-w-44">When</TableHeaderCell>
                    <TableHeaderCell className="min-w-40">Perfume</TableHeaderCell>
                    <TableHeaderCell className="w-24 min-w-24">Type</TableHeaderCell>
                    <TableHeaderCell className="w-24 min-w-24 text-right">Change</TableHeaderCell>
                    <TableHeaderCell className="w-24 min-w-24 text-right">After</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span
                          className="block truncate"
                          title={formatBusinessDateTime(row.createdAt)}
                        >
                          {formatBusinessDateTime(row.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="block truncate" title={row.productName}>
                          {row.productName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Token
                          size="sm"
                          label={row.type}
                          color={row.type === "sale" ? "red" : "gray"}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.quantityDeltaMl > 0 ? "+" : ""}
                        {formatQty(row.quantityDeltaMl)} ml
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(row.quantityAfterMl)} ml
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {movementPage ? (
              <PaginationNav
                pathname="/stock/oil"
                page={movementPage.page}
                totalPages={movementPage.totalPages}
                total={movementPage.total}
                search={resolvedSearch}
              />
            ) : null}
          </Card>
        </>
      )}
    </VStack>
  );
}
