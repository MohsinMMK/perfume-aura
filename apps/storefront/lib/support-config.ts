type SupportEnvironment = Record<string, string | undefined> & {
  STOREFRONT_SUPPORT_HOURS?: string;
  STOREFRONT_SUPPORT_PHONE_E164?: string;
  STOREFRONT_SUPPORT_WHATSAPP_E164?: string;
};

const indianE164 = /^\+91[6-9][0-9]{9}$/;

export type PublicSupportConfig = Readonly<{
  email: "support@perfumeaura.com";
  hours: string;
  phone: string;
  whatsapp: string;
}>;

export function resolvePublicSupportConfig(
  environment: SupportEnvironment = process.env,
): PublicSupportConfig | null {
  const phone = environment.STOREFRONT_SUPPORT_PHONE_E164?.trim();
  const whatsapp = environment.STOREFRONT_SUPPORT_WHATSAPP_E164?.trim();
  const hours = environment.STOREFRONT_SUPPORT_HOURS?.trim();
  if (
    !phone || !indianE164.test(phone) ||
    !whatsapp || !indianE164.test(whatsapp) ||
    hours !== "Mon-Sat 10:00-18:00 IST"
  ) return null;
  return { email: "support@perfumeaura.com", hours, phone, whatsapp };
}
