import { CommerceSettingsForm } from "@/components/commerce/commerce-settings-form";
import { DbUnavailableState } from "@/components/db-empty-state";
import { getCommerceSettings } from "@/lib/commerce";
import { safeDbQuery } from "@/lib/db-safe";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";
export default async function CommerceSettingsPage() {
  await requireCapability("commerce.release-gates.manage", { redirectToLogin: true });
  const result = await safeDbQuery(() => getCommerceSettings());
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6"><div><h1 className="font-heading text-2xl font-semibold tracking-tight">Checkout release gates</h1><p className="mt-1 text-sm text-muted-foreground">No shipping fee, threshold, policy, tax, or support claim is invented by the application.</p></div>{result.error ? <DbUnavailableState message={result.error} /> : <CommerceSettingsForm settings={result.data ?? null} />}</div>;
}
