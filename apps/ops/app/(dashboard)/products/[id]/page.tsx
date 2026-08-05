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
import { formatInr, formatQty } from "@/lib/money";
import { AddVariantForm } from "@/components/products/add-variant-form";
import { ProductLifecycleActions } from "@/components/products/product-lifecycle-actions";
import { ProductEditDialog } from "@/components/products/product-edit-dialog";
import { VariantActions } from "@/components/products/variant-actions";
import { hasOpsCapability } from "@/lib/ops-access";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const session = await requireCapability("catalog.view", {
    redirectToLogin: true,
  });
  const canEditContent = hasOpsCapability(
    session.user.role,
    "catalog.edit-content",
  );
  const canManageCommercials = hasOpsCapability(
    session.user.role,
    "catalog.manage-commercials",
  );
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
        <div className="flex flex-wrap items-center gap-2">
          {canEditContent ? (
            <ProductEditDialog
              key={product.updatedAt.toISOString()}
              product={{
                id: product.id,
                name: product.name,
                brand: product.brand,
                category: product.category,
                description: product.description,
                updatedAt: product.updatedAt.toISOString(),
              }}
            />
          ) : null}
          {canManageCommercials ? (
            <ProductLifecycleActions
              productId={product.id}
              productName={product.name}
              status={product.status}
              expectedUpdatedAt={product.updatedAt.toISOString()}
            />
          ) : null}
        </div>
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
                  {canManageCommercials ? (
                    <TableHead className="text-right">Cost</TableHead>
                  ) : null}
                  {canManageCommercials ? (
                    <TableHead className="text-right">Retail</TableHead>
                  ) : null}
                  {canManageCommercials ? <TableHead>Actions</TableHead> : null}
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
                      {canManageCommercials ? (
                        <TableCell className="text-right tabular-nums">
                          {v.costCents === null ? "—" : formatInr(v.costCents)}
                        </TableCell>
                      ) : null}
                      {canManageCommercials ? (
                        <TableCell className="text-right tabular-nums">
                          {v.retailCents === null ? "—" : formatInr(v.retailCents)}
                        </TableCell>
                      ) : null}
                      {canManageCommercials ? (
                        <TableCell>
                          <VariantActions
                            key={`${v.id}:${v.version}:${v.status}`}
                            productId={product.id}
                            productName={product.name}
                            productStatus={product.status}
                            variant={v}
                          />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {product.status === "active" && canManageCommercials ? (
        <AddVariantForm productId={product.id} />
      ) : null}
    </div>
  );
}
