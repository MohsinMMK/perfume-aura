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
import { SeriesDialog } from "@/components/series/series-dialog";
import { SeriesSizeDialog } from "@/components/series/series-size-dialog";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr, formatQty } from "@/lib/money";
import { hasOpsCapability } from "@/lib/ops-access";
import { listSeries, listSupplies } from "@/lib/production";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SeriesPage() {
  const session = await requireCapability("catalog.view", { redirectToLogin: true });
  const canManage = hasOpsCapability(session.user.role, "catalog.manage-commercials");
  const canViewStock = hasOpsCapability(session.user.role, "stock.view");

  const [seriesResult, suppliesResult] = await Promise.all([
    safeDbQuery(() => listSeries()),
    canManage && canViewStock
      ? safeDbQuery(() => listSupplies())
      : Promise.resolve({ data: [], error: null }),
  ]);
  const dbError = seriesResult.error ?? suppliesResult.error;
  const series = seriesResult.data ?? [];
  const packaging = (suppliesResult.data ?? [])
    .filter((supply) => supply.status === "active" && supply.kind !== "base")
    .map(({ id, kind, name, sizeMl }) => ({ id, kind, name, sizeMl }));

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Series"
        description="Each series sets the oil share, the sizes it is sold in, their default prices and the bottle and box each size uses."
        actions={
          <HStack gap={2} wrap="wrap">
            {canViewStock ? (
              <Button label="Supplies" href="/stock/supplies" variant="secondary" />
            ) : null}
            {canManage ? <SeriesDialog /> : null}
          </HStack>
        }
      />

      {dbError ? (
        <DbUnavailableState message={dbError} />
      ) : series.length === 0 ? (
        <Card padding={0} className="overflow-hidden">
          <EmptyState
            title="No series yet"
            description="Add Signature and Inspired, then the sizes each one is sold in."
          />
        </Card>
      ) : (
        series.map((item) => (
          <Card key={item.id} padding={0} className="overflow-hidden">
            <HStack
              gap={4}
              padding={4}
              justify="between"
              align="center"
              wrap="wrap"
              className="border-b border-border"
            >
              <VStack gap={1}>
                <HStack gap={2} align="center" wrap="wrap">
                  <Heading level={2}>{item.name}</Heading>
                  {item.status === "archived" ? (
                    <Token size="sm" label="Archived" color="gray" />
                  ) : null}
                </HStack>
                <Text color="secondary">
                  {item.oilConcentrationPercent}% oil, {100 - item.oilConcentrationPercent}% base
                  {" · "}oil low at {formatQty(item.oilReorderLevelMl)} ml
                  {" · "}
                  {item.productCount === 1 ? "1 perfume" : `${item.productCount} perfumes`}
                </Text>
              </VStack>
              {canManage ? (
                <HStack gap={2} wrap="wrap">
                  <SeriesSizeDialog
                    seriesId={item.id}
                    seriesName={item.name}
                    supplies={packaging}
                  />
                  <SeriesDialog series={item} />
                </HStack>
              ) : null}
            </HStack>
            {item.sizes.length === 0 ? (
              <EmptyState
                title="No sizes yet"
                description="Add the sizes this series is sold in, such as 10, 30, 50 and 100 ml."
              />
            ) : (
              <Table hasHover textOverflow="truncate">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell className="w-24 min-w-24 text-right">Size</TableHeaderCell>
                    <TableHeaderCell className="w-28 min-w-28 text-right">Oil / base</TableHeaderCell>
                    <TableHeaderCell className="w-32 min-w-32 text-right">Default price</TableHeaderCell>
                    <TableHeaderCell className="min-w-32">Bottle</TableHeaderCell>
                    <TableHeaderCell className="min-w-32">Box</TableHeaderCell>
                    <TableHeaderCell className="w-24 min-w-24">Sold</TableHeaderCell>
                    {canManage ? (
                      <TableHeaderCell className="w-20 min-w-20 text-right">
                        <span className="sr-only">Actions</span>
                      </TableHeaderCell>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.sizes.map((size) => {
                    const oilMl = Math.ceil((size.sizeMl * item.oilConcentrationPercent) / 100);
                    return (
                      <TableRow key={size.id}>
                        <TableCell className="text-right font-medium tabular-nums">
                          {size.sizeMl} ml
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {oilMl} / {size.sizeMl - oilMl} ml
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatInr(size.defaultRetailCents)}
                        </TableCell>
                        <TableCell>
                          {size.bottleName ?? (
                            <Text color="secondary">Not tracked</Text>
                          )}
                        </TableCell>
                        <TableCell>
                          {size.boxName ?? <Text color="secondary">None</Text>}
                        </TableCell>
                        <TableCell>
                          {size.isActive ? (
                            <Token size="sm" label="Yes" color="green" />
                          ) : (
                            <Token size="sm" label="Hidden" color="gray" />
                          )}
                        </TableCell>
                        {canManage ? (
                          <TableCell className="text-right">
                            <SeriesSizeDialog
                              seriesId={item.id}
                              seriesName={item.name}
                              size={size}
                              supplies={packaging}
                            />
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        ))
      )}
    </VStack>
  );
}
