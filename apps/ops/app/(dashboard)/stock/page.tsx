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
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { listActiveVariantsForStockSelect } from "@/lib/products";
import { listRecentMovements } from "@/lib/stock";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr, formatQty } from "@/lib/money";
import { ReceiveStockForm } from "@/components/stock/receive-stock-form";
import { AdjustStockForm } from "@/components/stock/adjust-stock-form";
import { DbUnavailableState } from "@/components/db-empty-state";
import { PageHeader } from "@/components/page-header";
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

function typeTokenColor(type: string): "green" | "red" | "gray" {
  switch (type) {
    case "receive":
    case "return":
      return "green";
    case "sale":
    case "damage":
      return "red";
    default:
      return "gray";
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
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Stock"
        description="Receive inventory and review the movement ledger."
        actions={
          <>
            <Button label="Oil stock" href="/stock/oil" variant="secondary" />
            <Button label="View low stock" href="/stock/low" variant="secondary" />
          </>
        }
      />

      {dbError ? (
        <DbUnavailableState message={dbError} />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
            <ReceiveStockForm variants={variantOptions} />
            {canAdjustStock ? <AdjustStockForm variants={variantOptions} /> : null}
          </div>

          <Card padding={0} className="overflow-hidden">
            <VStack gap={1} padding={4} className="border-b border-border">
              <Heading level={2}>Recent movements</Heading>
              <Text color="secondary">
                Paged ledger entries across all movement types.
              </Text>
            </VStack>
            {movements.length === 0 ? (
              <EmptyState
                title="No movements yet"
                description="Receive stock to create the first ledger entry."
                headingLevel={3}
              />
            ) : (
              <Table hasHover>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>When</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Product / SKU</TableHeaderCell>
                    <TableHeaderCell className="text-right">Delta</TableHeaderCell>
                    <TableHeaderCell className="text-right">After</TableHeaderCell>
                    {canViewCost ? (
                      <TableHeaderCell>Cost basis</TableHeaderCell>
                    ) : null}
                    <TableHeaderCell>Note</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Text type="supporting">
                          {formatBusinessDateTime(m.createdAt)}
                        </Text>
                      </TableCell>
                      <TableCell>
                        <Token
                          size="sm"
                          label={
                            m.type === "receive" && m.note === "Made at sale"
                              ? "made at sale"
                              : m.type
                          }
                          color={typeTokenColor(m.type)}
                        />
                      </TableCell>
                      <TableCell>
                        <VStack gap={0.5}>
                          <Text weight="medium">{m.productName}</Text>
                          <Text type="supporting">
                            {m.sku} · {m.sizeMl} ml
                          </Text>
                        </VStack>
                      </TableCell>
                      <TableCell
                        className={
                          m.quantityDelta >= 0
                            ? "text-right tabular-nums"
                            : "text-right tabular-nums text-error"
                        }
                      >
                        {m.quantityDelta > 0 ? "+" : ""}
                        {formatQty(m.quantityDelta)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(m.quantityAfter)}
                      </TableCell>
                      {canViewCost ? (
                        <TableCell>
                          {m.costBasis === "snapshot" &&
                          m.unitCostCents !== null ? (
                            <Text type="supporting" color="primary">
                              Captured · {formatInr(m.unitCostCents)}
                            </Text>
                          ) : m.costBasis === "legacy_current" &&
                            m.unitCostCents !== null ? (
                            <Text type="supporting">
                              Legacy estimate · {formatInr(m.unitCostCents)}
                            </Text>
                          ) : (
                            <Text type="supporting">—</Text>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Text color="secondary" maxLines={1}>
                          {m.note ?? "—"}
                        </Text>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
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
    </VStack>
  );
}
