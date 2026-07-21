import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@perfume-aura/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@perfume-aura/ui/components/table";
import { listLowStock } from "@/lib/stock";
import { safeDbQuery } from "@/lib/db-safe";
import { formatPkr, formatQty } from "@/lib/money";
import {
  DbUnavailableState,
  LowStockClearState,
} from "@/components/db-empty-state";

export const dynamic = "force-dynamic";

export default async function LowStockPage() {
  const result = await safeDbQuery(() => listLowStock());

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Low stock
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Active variants where on-hand ≤ reorder level.
          </p>
        </div>
        <Link
          href="/stock"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Receive stock
        </Link>
      </div>

      {result.error || !result.data ? (
        <DbUnavailableState message={result.error ?? "No data returned."} />
      ) : result.data.length === 0 ? (
        <LowStockClearState />
      ) : (
        <Card className="overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle>
              {result.data.length} SKU
              {result.data.length === 1 ? "" : "s"} need attention
            </CardTitle>
            <CardDescription>
              Restock from{" "}
              <Link href="/stock" className="underline underline-offset-4">
                Stock
              </Link>{" "}
              or product detail.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead className="text-right">Reorder</TableHead>
                  <TableHead className="text-right">Unit cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((row) => (
                  <TableRow key={row.variantId}>
                    <TableCell>
                      <Link
                        href={`/products/${row.productId}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {row.productName}
                      </Link>
                      {row.brand ? (
                        <p className="text-xs text-muted-foreground">
                          {row.brand}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.sizeMl} ml
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-destructive">
                      {formatQty(row.quantityOnHand)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatQty(row.reorderLevel)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPkr(row.costCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
