import Link from "next/link";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { listLowStock } from "@/lib/stock";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr, formatQty } from "@/lib/money";
import {
  DbUnavailableState,
  LowStockClearState,
} from "@/components/db-empty-state";
import { PageHeader } from "@/components/page-header";
import { MaterialAlertsCard } from "@/components/supplies/material-alerts";
import { listMaterialAlerts } from "@/lib/production";
import { hasOpsCapability } from "@/lib/ops-access";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LowStockPage() {
  const session = await requireCapability("stock.view", {
    redirectToLogin: true,
  });
  const canViewCost = hasOpsCapability(session.user.role, "stock.view-cost");

  const [result, alertsResult] = await Promise.all([
    safeDbQuery(() => listLowStock()),
    safeDbQuery(() => listMaterialAlerts()),
  ]);
  const alerts = alertsResult.data ?? { supplies: [], oil: [] };
  const alertCount = alerts.supplies.length + alerts.oil.length;

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Low stock"
        description="Oil, base and packaging to buy, and finished bottles at or below their reorder level."
        actions={
          <Button label="Receive stock" href="/stock" variant="secondary" />
        }
      />

      {alertsResult.error ? (
        <DbUnavailableState message={alertsResult.error} />
      ) : (
        <MaterialAlertsCard alerts={alerts} />
      )}

      {result.error || !result.data ? (
        <DbUnavailableState message={result.error ?? "No data returned."} />
      ) : result.data.length === 0 ? (
        alertCount === 0 ? (
          <LowStockClearState />
        ) : null
      ) : (
        <Card padding={0} className="overflow-hidden">
          <VStack gap={1} padding={4} className="border-b border-border">
            <Heading level={2}>
              {result.data.length} finished SKU
              {result.data.length === 1 ? "" : "s"} need attention
            </Heading>
            <Text color="secondary">
              Restock from{" "}
              <Link
                href="/stock"
                className="text-primary underline underline-offset-4"
              >
                Stock
              </Link>{" "}
              or product detail.
            </Text>
          </VStack>
          <Table hasHover>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Product</TableHeaderCell>
                <TableHeaderCell>SKU</TableHeaderCell>
                <TableHeaderCell className="text-right">Size</TableHeaderCell>
                <TableHeaderCell className="text-right">On hand</TableHeaderCell>
                <TableHeaderCell className="text-right">Reorder</TableHeaderCell>
                {canViewCost ? (
                  <TableHeaderCell className="text-right">Unit cost</TableHeaderCell>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((row) => (
                <TableRow key={row.variantId}>
                  <TableCell>
                    <VStack gap={0.5}>
                      <Link
                        href={`/products/${row.productId}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {row.productName}
                      </Link>
                      {row.brand ? (
                        <Text type="supporting">{row.brand}</Text>
                      ) : null}
                    </VStack>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.sizeMl} ml
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-error">
                    {formatQty(row.quantityOnHand)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-secondary">
                    {formatQty(row.reorderLevel)}
                  </TableCell>
                  {canViewCost ? (
                    <TableCell className="text-right tabular-nums">
                      {row.costCents === null ? "—" : formatInr(row.costCents)}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </VStack>
  );
}
