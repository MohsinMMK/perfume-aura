import Link from "next/link";
import { notFound } from "next/navigation";
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
import { getProduct } from "@/lib/products";
import { safeDbQuery } from "@/lib/db-safe";
import { formatPkr, formatQty } from "@/lib/money";
import { AddVariantForm } from "@/components/products/add-variant-form";
import { ArchiveProductButton } from "@/components/products/archive-product-button";
import { VariantStockDialogs } from "@/components/stock/variant-stock-dialogs";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const result = await safeDbQuery(() => getProduct(id));

  if (result.error) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle>Database unavailable</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const product = result.data;
  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            <Link
              href="/products"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Products
            </Link>
            <span className="mx-1.5">/</span>
            <span className="truncate">{product.name}</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {product.name}
            </h1>
            <Badge
              variant={product.status === "active" ? "secondary" : "outline"}
            >
              {product.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[product.brand, product.category].filter(Boolean).join(" · ") ||
              "No brand / category"}
            <span className="mx-1.5">·</span>
            <code className="text-xs">{product.slug}</code>
          </p>
          {product.description ? (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {product.description}
            </p>
          ) : null}
        </div>
        {product.status === "active" ? (
          <ArchiveProductButton
            productId={product.id}
            productName={product.name}
          />
        ) : null}
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Variants</CardTitle>
          <CardDescription>
            SKUs with on-hand balance. Receive or adjust stock from each row.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {product.variants.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No variants yet. Add a size/SKU below.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead className="text-right">Reorder</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Retail</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.variants.map((v) => {
                  const low =
                    v.quantityOnHand <= v.reorderLevel && v.status === "active";
                  return (
                    <TableRow key={v.id}>
                      <TableCell>
                        <span className="font-medium">{v.sku}</span>
                        {v.status === "archived" ? (
                          <Badge variant="outline" className="ml-2">
                            archived
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {v.sizeMl} ml
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            low
                              ? "font-medium tabular-nums text-destructive"
                              : "tabular-nums"
                          }
                        >
                          {formatQty(v.quantityOnHand)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatQty(v.reorderLevel)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPkr(v.costCents)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPkr(v.retailCents)}
                      </TableCell>
                      <TableCell>
                        {v.status === "active" ? (
                          <VariantStockDialogs
                            variantId={v.id}
                            label={`${product.name} — ${v.sku} (${v.sizeMl} ml)`}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {product.status === "active" ? (
        <AddVariantForm productId={product.id} />
      ) : null}
    </div>
  );
}
