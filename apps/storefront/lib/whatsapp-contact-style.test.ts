import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

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
    assert.match(globals, /\.aura-whatsapp-action\s*\{[\s\S]*width: 3\.5rem;[\s\S]*height: 3\.5rem;/u);
    assert.match(globals, /env\(safe-area-inset-bottom, 0px\)/u);
    assert.match(globals, /bottom: calc\(env\(safe-area-inset-bottom, 0px\) \+ 5\.25rem\)/u);
    assert.match(globals, /@media \(min-width: 640px\)/u);
    assert.match(globals, /\.aura-whatsapp-action:focus-visible \.aura-whatsapp-icon/u);
    assert.match(globals, /@media \(hover: hover\) and \(pointer: fine\)/u);
    assert.match(globals, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.aura-whatsapp-label/u);
  });
});
