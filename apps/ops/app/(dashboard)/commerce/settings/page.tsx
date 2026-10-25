import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { CommerceSettingsForm } from "@/components/commerce/commerce-settings-form";
import { ShippingServiceabilityForm } from "@/components/commerce/shipping-serviceability-form";
import { DbUnavailableState } from "@/components/db-empty-state";
import { PageHeader } from "@/components/page-header";
import { getCommerceSettings, listShippingServiceability } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";
export default async function CommerceSettingsPage() {
  await requireCapability("commerce.release-gates.manage", { redirectToLogin: true });
  const result = await safeDbQuery(async () => ({ settings: await getCommerceSettings(), serviceability: await listShippingServiceability() }));
  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Checkout release gates"
        description="No shipping fee, threshold, policy, tax, support, or delivery claim is invented by the application."
      />
      {result.error || !result.data ? <DbUnavailableState message={result.error ?? "No data returned."} /> : (
        <>
          <CommerceSettingsForm settings={result.data.settings} />
          <section>
            <VStack gap={4}>
              <VStack gap={1}>
                <Heading level={2}>PIN-code serviceability</Heading>
                <Text as="p" color="secondary">Activate only courier-verified PIN codes with approved business-day estimates.</Text>
              </VStack>
              <ShippingServiceabilityForm value={{ postalCode: "", delhiveryEnabled: false, indiaPostEnabled: false, deliveryMinBusinessDays: 3, deliveryMaxBusinessDays: 7, active: true, expectedUpdatedAt: "missing" }} />
              {result.data.serviceability.map((row) => <ShippingServiceabilityForm key={row.postalCode} value={{ ...row, expectedUpdatedAt: row.updatedAt.toISOString() }} />)}
            </VStack>
          </section>
        </>
      )}
    </VStack>
  );
}
