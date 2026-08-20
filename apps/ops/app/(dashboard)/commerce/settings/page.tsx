import { CommerceSettingsForm } from "@/components/commerce/commerce-settings-form";
import { ShippingServiceabilityForm } from "@/components/commerce/shipping-serviceability-form";
import { DbUnavailableState } from "@/components/db-empty-state";
import { getCommerceSettings, listShippingServiceability } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";
export default async function CommerceSettingsPage() {
  await requireCapability("commerce.release-gates.manage", { redirectToLogin: true });
  const result = await safeDbQuery(async () => ({ settings: await getCommerceSettings(), serviceability: await listShippingServiceability() }));
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6"><div><h1 className="font-heading text-2xl font-semibold tracking-tight">Checkout release gates</h1><p className="mt-1 text-sm text-muted-foreground">No shipping fee, threshold, policy, tax, support, or delivery claim is invented by the application.</p></div>{result.error || !result.data ? <DbUnavailableState message={result.error ?? "No data returned."} /> : <><CommerceSettingsForm settings={result.data.settings} /><section className="grid gap-4"><div><h2 className="font-heading text-xl font-semibold">PIN-code serviceability</h2><p className="mt-1 text-sm text-muted-foreground">Activate only courier-verified PIN codes with approved business-day estimates.</p></div><ShippingServiceabilityForm value={{ postalCode: "", delhiveryEnabled: false, indiaPostEnabled: false, deliveryMinBusinessDays: 3, deliveryMaxBusinessDays: 7, active: true, expectedUpdatedAt: "missing" }} />{result.data.serviceability.map((row) => <ShippingServiceabilityForm key={row.postalCode} value={{ ...row, expectedUpdatedAt: row.updatedAt.toISOString() }} />)}</section></>}</div>;
}
