import { redirect } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
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
import { DbUnavailableState } from "@/components/db-empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { AdjustSupplyForm } from "@/components/supplies/adjust-supply-form";
import { ReceiveSupplyForm } from "@/components/supplies/receive-supply-form";
import { SupplyDialog } from "@/components/supplies/supply-dialog";
import { supplyKindLabel, supplyUnit } from "@/components/supplies/supply-options";
import { formatBusinessDateTime } from "@/lib/business-date";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr, formatQty } from "@/lib/money";
import { hasOpsCapability } from "@/lib/ops-access";
import { canonicalPage, paginationHref, parsePage } from "@/lib/pagination";
import { listSupplies, listSupplyMovements } from "@/lib/production";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

const movementLabel = { receive: "Received", sale: "Used in sale", adjust: "Adjusted" } as const;

function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <HStack
      gap={4}
      padding={4}
      justify="between"
      align="center"
      wrap="wrap"
      className="border-b border-border"
    >
      <VStack gap={1}>
        <Heading level={2}>{title}</Heading>
        <Text color="secondary">{description}</Text>
      </VStack>
      {actions}
    </HStack>
  );
}

export default async function SuppliesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireCapability("stock.view", { redirectToLogin: true });
  const canReceive = hasOpsCapability(session.user.role, "stock.receive");
  const canAdjust = hasOpsCapability(session.user.role, "stock.adjust");
  const canViewCost = hasOpsCapability(session.user.role, "stock.view-cost");
  const resolvedSearch = await searchParams;
  const page = parsePage(resolvedSearch.page);

  const [suppliesResult, movementsResult] = await Promise.all([
    safeDbQuery(() => listSupplies()),
    safeDbQuery(() => listSupplyMovements({ page })),
  ]);
  const dbError = suppliesResult.error ?? movementsResult.error;
  const supplies = suppliesResult.data ?? [];
  const movementPage = movementsResult.data;
  if (movementPage) {
    const canonical = canonicalPage(
      movementPage.page,
      movementPage.totalPages,
      movementPage.total,
    );
    if (canonical) redirect(paginationHref("/stock/supplies", canonical, resolvedSearch));
  }
  const movements = movementPage?.items ?? [];
  const activeSupplies = supplies
    .filter((supply) => supply.status === "active")
    .map(({ id, kind, name, sizeMl }) => ({ id, kind, name, sizeMl }));

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Supplies"
        description="Empty bottles, boxes and the shared base mixture. Each sale made from oil uses one bottle, its box and the base."
        actions={
          <Button label="Series and sizes" href="/series" variant="secondary" />
        }
      />

      {dbError ? (
        <DbUnavailableState message={dbError} />
      ) : (
        <>
          <Card padding={0} className="overflow-hidden">
            <SectionHeader
              title="On hand"
              description="Low means the count has reached its reorder level."
              actions={canAdjust ? <SupplyDialog /> : undefined}
            />
            {supplies.length === 0 ? (
              <EmptyState
                title="No supplies yet"
                description="Add the bottles and boxes for each size, then receive them here."
              />
            ) : (
              <Table hasHover textOverflow="truncate">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell className="min-w-40">Name</TableHeaderCell>
                    <TableHeaderCell className="w-32 min-w-32">Type</TableHeaderCell>
                    <TableHeaderCell className="w-20 min-w-20 text-right">Size</TableHeaderCell>
                    <TableHeaderCell className="w-28 min-w-28 text-right">On hand</TableHeaderCell>
                    <TableHeaderCell className="w-28 min-w-28 text-right">Reorder at</TableHeaderCell>
                    <TableHeaderCell className="w-28 min-w-28">Status</TableHeaderCell>
                    {canAdjust ? (
                      <TableHeaderCell className="w-20 min-w-20 text-right">
                        <span className="sr-only">Actions</span>
                      </TableHeaderCell>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplies.map((supply) => (
                    <TableRow key={supply.id}>
                      <TableCell className="font-medium">
                        <span className="block truncate" title={supply.name}>
                          {supply.name}
                        </span>
                      </TableCell>
                      <TableCell>{supplyKindLabel[supply.kind]}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {supply.sizeMl ? `${supply.sizeMl} ml` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(supply.quantityOnHand)} {supplyUnit(supply.kind)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(supply.reorderLevel)} {supplyUnit(supply.kind)}
                      </TableCell>
                      <TableCell>
                        {supply.status === "archived" ? (
                          <Token size="sm" label="Archived" color="gray" />
                        ) : supply.isLow ? (
                          <Token size="sm" label="Low" color="red" />
                        ) : (
                          <Token size="sm" label="OK" color="green" />
                        )}
                      </TableCell>
                      {canAdjust ? (
                        <TableCell className="text-right">
                          <SupplyDialog supply={supply} />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {canReceive || canAdjust ? (
            <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
              {canReceive ? (
                <ReceiveSupplyForm supplies={activeSupplies} canViewCost={canViewCost} />
              ) : null}
              {canAdjust ? <AdjustSupplyForm supplies={activeSupplies} /> : null}
            </div>
          ) : null}

          <Card padding={0} className="overflow-hidden">
            <SectionHeader
              title="Supply movements"
              description="Append-only ledger of receipts, sales and adjustments."
            />
            {movements.length === 0 ? (
              <EmptyState
                title="No supply movements"
                description="Receipts and sales made from oil will appear here."
              />
            ) : (
              <Table hasHover textOverflow="truncate">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell className="w-44 min-w-44">When</TableHeaderCell>
                    <TableHeaderCell className="min-w-40">Supply</TableHeaderCell>
                    <TableHeaderCell className="w-32 min-w-32">Type</TableHeaderCell>
                    <TableHeaderCell className="w-24 min-w-24 text-right">Change</TableHeaderCell>
                    <TableHeaderCell className="w-24 min-w-24 text-right">After</TableHeaderCell>
                    <TableHeaderCell className="w-48 min-w-48">Supplier / note</TableHeaderCell>
                    {canViewCost ? (
                      <TableHeaderCell className="w-24 min-w-24 text-right">Cost</TableHeaderCell>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatBusinessDateTime(row.createdAt)}</TableCell>
                      <TableCell>
                        <span className="block truncate" title={row.supplyName}>
                          {row.supplyName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Token
                          size="sm"
                          label={movementLabel[row.type]}
                          color={row.type === "sale" ? "red" : row.type === "receive" ? "green" : "gray"}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.quantityDelta > 0 ? "+" : ""}
                        {formatQty(row.quantityDelta)} {supplyUnit(row.kind)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(row.quantityAfter)} {supplyUnit(row.kind)}
                      </TableCell>
                      <TableCell>
                        <span
                          className="block truncate"
                          title={row.supplierName ?? row.note ?? undefined}
                        >
                          {row.supplierName ?? row.note ?? "—"}
                        </span>
                      </TableCell>
                      {canViewCost ? (
                        <TableCell className="text-right tabular-nums">
                          {row.totalCostCents === null ? "—" : formatInr(row.totalCostCents)}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {movementPage ? (
              <PaginationNav
                pathname="/stock/supplies"
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
