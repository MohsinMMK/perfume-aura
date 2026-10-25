import Link from "next/link";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { DbUnavailableState } from "@/components/db-empty-state";
import { PageHeader } from "@/components/page-header";
import { safeDbQuery } from "@/lib/db-safe";
import { getCommerceOverview } from "@/lib/commerce";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CommercePage() {
  await requireCapability("commerce.view", { redirectToLogin: true });
  const result = await safeDbQuery(() => getCommerceOverview());
  const metrics = result.data
    ? [
        ["Catalog gates", result.data.catalogBlocked, "/commerce/catalog"],
        ["Open orders", result.data.openOrders, "/commerce/orders"],
        ["Payment attention", result.data.paymentAttention, "/commerce/orders"],
        ["Pending reviews", result.data.pendingReviews, "/commerce/reviews"],
        ["New inquiries", result.data.newInquiries, "/commerce/support"],
        ["Open returns", result.data.openReturns, "/commerce/support"],
      ] as const
    : [];
  const checkoutEnabled = Boolean(result.data?.checkoutEnabled);

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Storefront commerce"
        description="Catalog approval, customer orders, fulfillment, and release gates."
        actions={
          <Token
            size="sm"
            label={`Checkout ${checkoutEnabled ? "enabled" : "gated"}`}
            color={checkoutEnabled ? "green" : "gray"}
          />
        }
      />
      {result.error || !result.data ? <DbUnavailableState message={result.error ?? "No data returned."} /> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([label, value, href]) => (
          <Link
            key={label}
            href={href}
            className="group rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Card className="h-full transition-colors group-hover:border-border-strong">
              <VStack gap={1}>
                <Text as="p" color="secondary">{label}</Text>
                <Text as="p" size="3xl" weight="semibold" hasTabularNumbers>{value}</Text>
              </VStack>
            </Card>
          </Link>
        ))}
      </div>
      <Card>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>Release sequence</Heading>
            <Text as="p" color="secondary">The store remains fail-closed until every independent gate is proven.</Text>
          </VStack>
          <Grid columns={{ minWidth: 200 }} gap={3}>
            {[
              "Approve each product’s legal, content, media, SKU, stock, cost, and price data.",
              "Approve shipping, returns, cancellation, tax, and support settings.",
              "Verify Cashfree, customer-auth, OAuth, email, and production callback domains.",
              "Run the authorized prepaid UPI lifecycle acceptance tests before release.",
            ].map((text, index) => (
              <div key={text} className="rounded-md border border-border p-4">
                <VStack gap={2}>
                  <Text as="span" type="supporting" weight="semibold" className="uppercase">Gate {index + 1}</Text>
                  <Text as="p">{text}</Text>
                </VStack>
              </div>
            ))}
          </Grid>
        </VStack>
      </Card>
    </VStack>
  );
}
