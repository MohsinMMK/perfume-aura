import Link from "next/link";
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
import { listActiveVariantsForSelect } from "@/lib/products";
import { listRecentMovements } from "@/lib/stock";
import { safeDbQuery } from "@/lib/db-safe";
import { formatQty } from "@/lib/money";
import { ReceiveStockForm } from "@/components/stock/receive-stock-form";
import { AdjustStockForm } from "@/components/stock/adjust-stock-form";
import { DbUnavailableState } from "@/components/db-empty-state";

export const dynamic = "force-dynamic";

function formatWhen(d: Date): string {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

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

export default async function StockPage() {
  // Independent loaders — parallelize (vercel-react-best-practices: async-parallel)
  const [variantsResult, movementsResult] = await Promise.all([
    safeDbQuery(() => listActiveVariantsForSelect()),
    safeDbQuery(() => listRecentMovements(40)),
  ]);

  const dbError = variantsResult.error ?? movementsResult.error;
  const variants = variantsResult.data ?? [];
  const movements = movementsResult.data ?? [];

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
            <AdjustStockForm variants={variantOptions} />
          </div>

          <Card className="overflow-hidden py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Recent movements</CardTitle>
              <CardDescription>
                Last {movements.length} ledger entries (all types).
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
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatWhen(m.createdAt)}
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
                        <TableCell className="max-w-[12rem] truncate text-muted-foreground">
                          {m.note ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
