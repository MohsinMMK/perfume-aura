import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { createProductWhatsAppUrl } from "./whatsapp-contact";

describe("storefront WhatsApp contact action", () => {
  it("opens the supplied Indian number with the approved prefilled message", async () => {
    const [action, contact] = await Promise.all([
      readFile(
        new URL("../components/whatsapp-contact-action.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("./whatsapp-contact.ts", import.meta.url), "utf8"),
    ]);

    assert.match(contact, /whatsappContactNumber = "919549549060"/u);
    assert.match(contact, /whatsappContactDisplayNumber = "\+91 95495 49060"/u);
    assert.match(
      contact,
      /Hi Perfume Aura, I’d like to know more about your fragrances\./u,
    );
    assert.match(contact, /https:\/\/wa\.me\/\$\{whatsappContactNumber\}/u);
    assert.match(action, /href=\{whatsappContactUrl\}/u);
    assert.match(action, /target="_blank"/u);
    assert.match(action, /rel="noreferrer"/u);
    assert.match(action, /aria-label="Chat with Perfume Aura on WhatsApp"/u);
  });

  it("prefills the selected product, size, quantity, and amount for a WhatsApp order", () => {
    const url = new URL(createProductWhatsAppUrl({
      productName: "Regent   Noir",
      sizeMl: 105,
      quantity: 3,
      unitPrice: { currency: "INR", amountMinor: 220_000 },
      totalPrice: { currency: "INR", amountMinor: 660_000 },
    }));

    assert.equal(url.hostname, "wa.me");
    assert.equal(url.pathname, "/919549549060");
    assert.equal(
      url.searchParams.get("text"),
      [
        "Hi Perfume Aura, I’d like to buy this fragrance:",
        "Product: Regent Noir",
        "Size: 105 ml",
        "Quantity: 3",
        "Price per bottle: ₹2,200",
        "Total: ₹6,600",
        "Please help me complete the order.",
      ].join("\n"),
    );
  });

  it("uses the shared shell and preserves touch, focus, safe-area, and motion behavior", async () => {
    const [shell, action, globals] = await Promise.all([
      readFile(
        new URL("../components/storefront-shell.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../components/whatsapp-contact-action.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    ]);

    assert.match(shell, /<WhatsAppContactAction \/>/u);
    assert.match(action, /WhatsappIcon/u);
    assert.match(action, /pathname\.startsWith\("\/products\/"\)/u);
    assert.match(action, /isProductPage \? " aura-whatsapp-action--product"/u);
    assert.match(action, /captureStorefrontAction\("product_purchase", "open_whatsapp"\)/u);
    assert.match(action, /Buy through WhatsApp/u);
    assert.match(action, /href=\{productWhatsAppUrl\}/u);
    assert.match(globals, /\.aura-whatsapp-action\s*\{[\s\S]*width: 3\.5rem;[\s\S]*height: 3\.5rem;/u);
    assert.match(globals, /env\(safe-area-inset-bottom, 0px\)/u);
    assert.match(globals, /bottom: calc\(env\(safe-area-inset-bottom, 0px\) \+ 5\.25rem\)/u);
    assert.match(globals, /@media \(min-width: 640px\)/u);
    assert.match(globals, /@media \(max-width: 639px\)[\s\S]*\.aura-whatsapp-action--product\s*\{[\s\S]*display: none;/u);
    assert.match(globals, /\.aura-whatsapp-action:focus-visible \.aura-whatsapp-icon/u);
    assert.match(globals, /@media \(hover: hover\) and \(pointer: fine\)/u);
    assert.match(globals, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.aura-whatsapp-label/u);
  });
});
