import { notFound } from "next/navigation";
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
import { getProduct } from "@/lib/products";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr, formatQty } from "@/lib/money";
import { listActiveSeriesOptions, listVariantCapacity } from "@/lib/production";
import { AddVariantForm } from "@/components/products/add-variant-form";
import { ProductLifecycleActions } from "@/components/products/product-lifecycle-actions";
import { ProductEditDialog } from "@/components/products/product-edit-dialog";
import { ProductSeriesSelect } from "@/components/products/product-series-select";
import { VariantActions } from "@/components/products/variant-actions";
import { hasOpsCapability } from "@/lib/ops-access";
import { requireCapability } from "@/lib/session";
import { DbUnavailableState } from "@/components/db-empty-state";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";

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
      <VStack gap={6} className="mx-auto w-full max-w-6xl">
        <DbUnavailableState message={result.error} />
      </VStack>
    );
  }

  const product = result.data;
  if (!product) {
    notFound();
  }
  const [capacityResult, seriesResult] = await Promise.all([
    safeDbQuery(() => listVariantCapacity(product.variants.map((v) => v.id))),
    safeDbQuery(() => listActiveSeriesOptions()),
  ]);
  const capacity = capacityResult.data ?? {};
  const seriesOptions = seriesResult.data ?? [];
  const firstCapacity = product.variants
    .map((v) => capacity[v.id])
    .find((row) => row !== undefined);
  const seriesName =
    firstCapacity?.seriesName ??
    seriesOptions.find((option) => option.id === product.seriesId)?.name ??
    "Archived";
  const concentration = firstCapacity?.concentrationPercent ?? null;

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <HStack justify="between" align="start" gap={4} wrap="wrap">
        <VStack gap={1} className="min-w-0">
          <PageBreadcrumbs
            items={[{ label: "Products", href: "/products" }, { label: product.name }]}
          />
          <HStack gap={2} align="center" wrap="wrap">
            <Heading level={1}>{product.name}</Heading>
            <Token
              size="sm"
              label={product.status}
              color={product.status === "active" ? "green" : "gray"}
            />
          </HStack>
          <Text as="p" color="secondary">
            {[product.brand, product.category].filter(Boolean).join(" · ") ||
              "No brand / category"}
            <span className="mx-1.5">·</span>
            <code className="text-xs">{product.slug}</code>
          </Text>
          {product.description ? (
            <Text as="p" color="secondary" className="max-w-2xl">
              {product.description}
            </Text>
          ) : null}
        </VStack>
        <HStack gap={2} align="center" wrap="wrap">
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
        </HStack>
      </HStack>

      <Card padding={0} className="overflow-hidden">
        <HStack
          gap={4}
          padding={4}
          justify="between"
          align="end"
          wrap="wrap"
          className="border-b border-border"
        >
          <VStack gap={1}>
            <Heading level={2}>Variants</Heading>
            <Text as="p" color="secondary">
              {product.seriesId
                ? `${seriesName} series${concentration === null ? "" : ` · ${concentration}% oil, ${100 - concentration}% base`}. Finished bottles sell first; the rest are made at sale.`
                : "Not in a series, so only finished bottles on hand can be sold."}
            </Text>
          </VStack>
          {canManageCommercials ? (
            <ProductSeriesSelect
              key={product.seriesId ?? "none"}
              productId={product.id}
              seriesId={product.seriesId}
              options={seriesOptions}
            />
          ) : null}
        </HStack>
        {product.variants.length === 0 ? (
          <VStack padding={4}>
            <Text as="p" color="secondary">
              No variants yet. Add a size/SKU below.
            </Text>
          </VStack>
        ) : (
          <Table hasHover>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>SKU</TableHeaderCell>
                <TableHeaderCell className="text-right">Size</TableHeaderCell>
                <TableHeaderCell className="text-right">On hand</TableHeaderCell>
                <TableHeaderCell className="text-right">Reorder</TableHeaderCell>
                {product.seriesId ? (
                  <TableHeaderCell className="text-right">Oil / base</TableHeaderCell>
                ) : null}
                {product.seriesId ? (
                  <TableHeaderCell>Can make</TableHeaderCell>
                ) : null}
                {canManageCommercials ? (
                  <TableHeaderCell className="text-right">Cost</TableHeaderCell>
                ) : null}
                {canManageCommercials ? (
                  <TableHeaderCell className="text-right">Retail</TableHeaderCell>
                ) : null}
                {canManageCommercials ? (
                  <TableHeaderCell>Actions</TableHeaderCell>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.variants.map((v) => {
                const low =
                  v.quantityOnHand <= v.reorderLevel && v.status === "active";
                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <HStack gap={2} align="center" wrap="wrap">
                        <span className="font-medium">{v.sku}</span>
                        {v.status === "archived" ? (
                          <Token size="sm" label="archived" color="gray" />
                        ) : null}
                      </HStack>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {v.sizeMl} ml
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          low
                            ? "font-medium tabular-nums text-error"
                            : "tabular-nums"
                        }
                      >
                        {formatQty(v.quantityOnHand)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-secondary">
                      {formatQty(v.reorderLevel)}
                    </TableCell>
                    {product.seriesId ? (
                      <TableCell className="text-right tabular-nums">
                        {capacity[v.id]?.oilMlPerBottle != null
                          ? `${capacity[v.id]!.oilMlPerBottle} / ${capacity[v.id]!.baseMlPerBottle} ml`
                          : "—"}
                      </TableCell>
                    ) : null}
                    {product.seriesId ? (
                      <TableCell>
                        {capacity[v.id]?.blocker ? (
                          <Text type="supporting" color="secondary">
                            {capacity[v.id]!.blocker}
                          </Text>
                        ) : (
                          <Text type="supporting">
                            {formatQty(capacity[v.id]?.canMake ?? 0)} more
                            {capacity[v.id]?.limitedBy
                              ? ` · ${capacity[v.id]!.limitedBy} runs out first`
                              : ""}
                          </Text>
                        )}
                      </TableCell>
                    ) : null}
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
      </Card>

      {product.status === "active" && canManageCommercials ? (
        <AddVariantForm productId={product.id} />
      ) : null}
    </VStack>
  );
}
