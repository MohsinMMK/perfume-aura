import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";
import { CreateProductForm } from "@/components/products/create-product-form";
import { CreateSeriesProductForm } from "@/components/products/create-series-product-form";
import { safeDbQuery } from "@/lib/db-safe";
import { listSeriesForProductCreate } from "@/lib/production";
import { requireCapability } from "@/lib/session";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";

export const dynamic = "force-dynamic";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  await requireCapability("catalog.manage-commercials", {
    redirectToLogin: true,
  });
  const { mode } = await searchParams;
  const seriesResult = await safeDbQuery(() => listSeriesForProductCreate());
  const series = seriesResult.data ?? [];
  const isCustom = mode === "custom" || series.length === 0;

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <HStack gap={4} justify="between" align="end" wrap="wrap">
        <VStack gap={1}>
          <PageBreadcrumbs
            items={[{ label: "Products", href: "/products" }, { label: "New" }]}
          />
          <Heading level={1}>Create product</Heading>
        </VStack>
        {series.length > 0 ? (
          <Button
            label={isCustom ? "Use a series" : "Without a series"}
            href={isCustom ? "/products/new" : "/products/new?mode=custom"}
            variant="secondary"
          />
        ) : null}
      </HStack>
      {isCustom ? <CreateProductForm /> : <CreateSeriesProductForm series={series} />}
    </VStack>
  );
}
