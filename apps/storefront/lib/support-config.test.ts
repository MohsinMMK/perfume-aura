import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvePublicSupportConfig } from "./support-config";

describe("public support configuration", () => {
  it("fails closed unless Indian phone, WhatsApp, and locked hours are complete", () => {
    assert.equal(resolvePublicSupportConfig({}), null);
    assert.equal(resolvePublicSupportConfig({
      STOREFRONT_SUPPORT_PHONE_E164: "+919876543210",
      STOREFRONT_SUPPORT_WHATSAPP_E164: "+919876543211",
      STOREFRONT_SUPPORT_HOURS: "Mon-Sat 10:00-18:00 IST",
    })?.email, "support@perfumeaura.com");
    assert.equal(resolvePublicSupportConfig({
      STOREFRONT_SUPPORT_PHONE_E164: "+14155552671",
      STOREFRONT_SUPPORT_WHATSAPP_E164: "+919876543211",
      STOREFRONT_SUPPORT_HOURS: "Mon-Sat 10:00-18:00 IST",
    }), null);
  });
});
