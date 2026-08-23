import { commerceSettings, db, eq } from "@perfume-aura/db";

export type ApprovedCommercePolicy = Readonly<{
  flatShippingAmountMinor: number;
  freeShippingThresholdMinor: number;
  supportChannel: "support@perfumeaura.com";
  deliveryEstimate: "3–7 business days";
  cancellationSummary: "Cancellation is available before dispatch.";
  returnsSummary: "Unopened products may be requested for return within seven days of delivery. Damaged or incorrect items must be reported to support.";
}>;

type CommercePolicySettings = Readonly<{
  flatShippingAmountMinor: number | null;
  freeShippingThresholdMinor: number | null;
  taxPolicyApproved: boolean;
  catalogLegalApproved: boolean;
  supportChannel: string | null;
  supportOperationsApproved: boolean;
  shippingPolicyApproved: boolean;
  returnsPolicyApproved: boolean;
  cancellationPolicyApproved: boolean;
  checkoutEnabled: boolean;
}>;

export function resolveApprovedCommercePolicy(
  settings: CommercePolicySettings | null | undefined,
  release: Readonly<{ publicRelease: boolean; checkoutReleaseApproved: boolean }>,
): ApprovedCommercePolicy | null {
  if (
    !release.publicRelease ||
    !release.checkoutReleaseApproved ||
    !settings?.checkoutEnabled ||
    !settings.taxPolicyApproved ||
    !settings.catalogLegalApproved ||
    !settings.supportOperationsApproved ||
    !settings.shippingPolicyApproved ||
    !settings.returnsPolicyApproved ||
    !settings.cancellationPolicyApproved ||
    settings.flatShippingAmountMinor !== 9_900 ||
    settings.freeShippingThresholdMinor !== 99_900 ||
    settings.supportChannel?.toLowerCase() !== "support@perfumeaura.com"
  ) return null;

  return {
    flatShippingAmountMinor: settings.flatShippingAmountMinor,
    freeShippingThresholdMinor: settings.freeShippingThresholdMinor,
    supportChannel: "support@perfumeaura.com",
    deliveryEstimate: "3–7 business days",
    cancellationSummary: "Cancellation is available before dispatch.",
    returnsSummary: "Unopened products may be requested for return within seven days of delivery. Damaged or incorrect items must be reported to support.",
  };
}

export async function loadApprovedCommercePolicy(): Promise<ApprovedCommercePolicy | null> {
  if (
    !process.env.DATABASE_URL ||
    process.env.STOREFRONT_PUBLIC_RELEASE !== "true" ||
    process.env.STOREFRONT_CHECKOUT_RELEASE_APPROVED !== "true"
  ) return null;

  const [settings] = await db.select({
    flatShippingAmountMinor: commerceSettings.flatShippingAmountMinor,
    freeShippingThresholdMinor: commerceSettings.freeShippingThresholdMinor,
    taxPolicyApproved: commerceSettings.taxPolicyApproved,
    catalogLegalApproved: commerceSettings.catalogLegalApproved,
    supportChannel: commerceSettings.supportChannel,
    supportOperationsApproved: commerceSettings.supportOperationsApproved,
    shippingPolicyApproved: commerceSettings.shippingPolicyApproved,
    returnsPolicyApproved: commerceSettings.returnsPolicyApproved,
    cancellationPolicyApproved: commerceSettings.cancellationPolicyApproved,
    checkoutEnabled: commerceSettings.checkoutEnabled,
  }).from(commerceSettings)
    .where(eq(commerceSettings.id, "primary"))
    .limit(1);

  return resolveApprovedCommercePolicy(settings, {
    publicRelease: process.env.STOREFRONT_PUBLIC_RELEASE === "true",
    checkoutReleaseApproved: process.env.STOREFRONT_CHECKOUT_RELEASE_APPROVED === "true",
  });
}
