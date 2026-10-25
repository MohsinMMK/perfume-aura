import Link from "next/link";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
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
import { supplyKindLabel, supplyUnit } from "@/components/supplies/supply-options";
import { formatQty } from "@/lib/money";
import type { MaterialAlerts } from "@/lib/production";

/** Oil, base and packaging at or below their reorder level: what to buy next. */
export function MaterialAlertsCard({ alerts }: { alerts: MaterialAlerts }) {
  const total = alerts.supplies.length + alerts.oil.length;
  if (total === 0) return null;

  return (
    <Card padding={0} className="overflow-hidden">
      <HStack
        gap={4}
        padding={4}
        justify="between"
        align="center"
        wrap="wrap"
        className="border-b border-border"
      >
        <VStack gap={1}>
          <Heading level={2}>
            Buy soon: {total} material{total === 1 ? "" : "s"} low
          </Heading>
          <Text color="secondary">
            Bottles cannot be made once oil, base or packaging runs out.
          </Text>
        </VStack>
        <HStack gap={2} wrap="wrap">
          {alerts.oil.length > 0 ? (
            <Button label="Receive oil" href="/stock/oil" variant="secondary" />
          ) : null}
          {alerts.supplies.length > 0 ? (
            <Button label="Receive supplies" href="/stock/supplies" variant="secondary" />
          ) : null}
        </HStack>
      </HStack>
      <Table hasHover textOverflow="truncate">
        <TableHeader>
          <TableRow>
            <TableHeaderCell className="min-w-40">Material</TableHeaderCell>
            <TableHeaderCell className="w-36 min-w-36">Type</TableHeaderCell>
            <TableHeaderCell className="w-32 min-w-32 text-right">Left</TableHeaderCell>
            <TableHeaderCell className="w-32 min-w-32 text-right">Reorder at</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.oil.map((row) => (
            <TableRow key={`oil-${row.productId}`}>
              <TableCell>
                <Link
                  href={`/products/${row.productId}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {row.productName} oil
                </Link>
              </TableCell>
              <TableCell>
                <Token size="sm" label={`${row.seriesName} oil`} color="orange" />
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums text-error">
                {formatQty(row.availableMl)} ml
              </TableCell>
              <TableCell className="text-right tabular-nums text-secondary">
                {formatQty(row.reorderLevelMl)} ml
              </TableCell>
            </TableRow>
          ))}
          {alerts.supplies.map((row) => (
            <TableRow key={`supply-${row.id}`}>
              <TableCell className="font-medium">
                <span className="block truncate" title={row.name}>
                  {row.name}
                </span>
              </TableCell>
              <TableCell>
                <Token
                  size="sm"
                  label={
                    row.sizeMl ? `${supplyKindLabel[row.kind]} ${row.sizeMl} ml` : supplyKindLabel[row.kind]
                  }
                  color="blue"
                />
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums text-error">
                {formatQty(row.quantityOnHand)} {supplyUnit(row.kind)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-secondary">
                {formatQty(row.reorderLevel)} {supplyUnit(row.kind)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
