import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("storefront header logo", () => {
  it("keeps the desktop navigation large and comfortably clickable", async () => {
    const header = await readFile(
      new URL("../components/site-header.tsx", import.meta.url),
      "utf8",
    );

    assert.match(header, /-mt-\[var\(--aura-gutter\)\][\s\S]*w-\[min\(66vw,58rem\)\]/u);
    assert.match(
      header,
      /items-center justify-end gap-7[\s\S]*pl-8 pr-2[\s\S]*2xl:gap-14/u,
    );
    assert.match(header, /min-h-20[\s\S]*text-\[clamp\(1\.6rem,2vw,2rem\)\]/u);
  });

  it("rolls every desktop navigation label from solid to outline", async () => {
    const [header, customerHeader, navLabel, globals] = await Promise.all([
      readFile(new URL("../components/site-header.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../components/customer-header-navigation.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../components/nav-wave-label.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    ]);

    assert.match(header, /<NavWaveLabel label=\{item\.label\} \/>/u);
    assert.match(header, /<NavWaveLabel label=\{`Cart\(\$\{cart\?\.quantity \?\? 0\}\)`\} \/>/u);
    assert.match(header, /<NavWaveLabel label="Account" \/>/u);
    assert.match(customerHeader, /<NavWaveLabel label="Account" \/>/u);
    assert.match(navLabel, /aura-nav-wave__face--solid/u);
    assert.match(navLabel, /aura-nav-wave__face--outline/u);
    assert.match(globals, /transition-delay:\s*calc\(var\(--aura-nav-index\) \* 18ms\)/u);
    assert.match(globals, /prefers-reduced-motion:\s*reduce/u);
    assert.doesNotMatch(header, /hover:border-\[var\(--aura-ivory\)\]/u);
    assert.doesNotMatch(
      customerHeader,
      /aura-nav-action[^"\n]*hover:border-\[var\(--aura-ivory\)\]/u,
    );
  });

  it("places the desktop account control after the cart", async () => {
    const header = await readFile(
      new URL("../components/site-header.tsx", import.meta.url),
      "utf8",
    );
    const cartPosition = header.indexOf("<NavWaveLabel label={`Cart(");
    const accountPosition = header.indexOf('<NavWaveLabel label="Account" />');

    assert.ok(cartPosition >= 0, "desktop cart label must exist");
    assert.ok(accountPosition > cartPosition, "desktop account must follow cart");
  });

  it("links the verified Instagram profile from the mobile navigation menu", async () => {
    const header = await readFile(
      new URL("../components/site-header.tsx", import.meta.url),
      "utf8",
    );

    assert.match(header, /href="https:\/\/www\.instagram\.com\/perfume\.aura\.hyd\/"/u);
    assert.match(header, /aria-label="Open Perfume Aura on Instagram"/u);
    assert.match(header, /target="_blank"/u);
    assert.match(header, /rel="noreferrer"/u);
    assert.match(header, /<HugeiconsIcon icon=\{InstagramIcon\}/u);
    assert.doesNotMatch(header, /utm_source=|igsi=/u);
  });

  it("links WhatsApp from the mobile menu with the phone number as its identifier", async () => {
    const header = await readFile(
      new URL("../components/site-header.tsx", import.meta.url),
      "utf8",
    );

    assert.match(header, /href=\{whatsappContactUrl\}/u);
    assert.match(header, /Open WhatsApp chat with Perfume Aura at/u);
    assert.match(header, /\{whatsappContactDisplayNumber\}/u);
    assert.match(header, /<HugeiconsIcon icon=\{WhatsappIcon\}/u);
  });

  it("hands the desktop navigation off to descending compact controls", async () => {
    const [header, globals] = await Promise.all([
      readFile(new URL("../components/site-header.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    ]);

    assert.match(header, /-translate-y-5 opacity-0/u);
    assert.match(header, /data-compact-controls/u);
    assert.match(header, /aura-compact-controls-enter/u);
    assert.match(globals, /@keyframes aura-compact-controls-drop/u);
    assert.match(
      globals,
      /prefers-reduced-motion: no-preference[\s\S]*aura-compact-controls-enter/u,
    );
  });

  it("opens the cart as a floating panel anchored toward its trigger", async () => {
    const [cartDrawer, globals] = await Promise.all([
      readFile(new URL("../components/cart-drawer.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    ]);

    assert.match(cartDrawer, /aura-cart-popover/u);
    assert.match(globals, /\.aura-cart-popover\[data-side="right"\]/u);
    assert.match(globals, /@keyframes aura-cart-popover-enter/u);
    assert.match(globals, /transform-origin:\s*78% 0/u);
    assert.match(
      globals,
      /prefers-reduced-motion:\s*reduce[\s\S]*\.aura-cart-popover\[data-open\]/u,
    );
  });

  it("drops the complete home logo into place on page load", async () => {
    const [header, globals] = await Promise.all([
      readFile(new URL("../components/site-header.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    ]);

    assert.match(header, /aura-header-logo-enter/u);
    assert.match(globals, /@keyframes aura-header-logo-drop/u);
    assert.match(
      globals,
      /aura-header-logo-drop 800ms cubic-bezier\(0\.37, 0, 0\.63, 1\)[\s\S]*100ms both/u,
    );
    assert.match(
      globals,
      /@keyframes aura-header-logo-drop[\s\S]*translate3d\(0, var\(--aura-logo-enter-y\), 0\)[\s\S]*translate3d\(0, 0, 0\)/u,
    );
  });

  it("keeps the compact wordmark transparent over page content", async () => {
    const [globals, wordmark] = await Promise.all([
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
      readFile(
        new URL("../public/brand/perfume-aura-wordmark.svg", import.meta.url),
        "utf8",
      ),
    ]);
    const logoRule = globals.match(/\.aura-header-logo\s*\{([^}]*)\}/u);

    assert.ok(logoRule?.[1], "header logo rule must exist");
    assert.match(logoRule[1], /background:\s*transparent;/u);
    assert.match(logoRule[1], /backdrop-filter:\s*none;/u);
    assert.doesNotMatch(wordmark, /<(?:rect|image|foreignObject)\b/iu);
  });

  it("uses the brand cream for both logo assets", async () => {
    const [icon, wordmark] = await Promise.all([
      readFile(
        new URL("../public/brand/perfume-aura-icon.svg", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../public/brand/perfume-aura-wordmark.svg", import.meta.url),
        "utf8",
      ),
    ]);

    for (const asset of [icon, wordmark]) {
      assert.match(asset, /fill="#f5e4c7"/u);
      assert.doesNotMatch(asset, /fill="(?:white|#fff(?:fff)?)"/iu);
    }
  });

  it("shows only the wordmark on mobile while preserving the expanded logo above mobile", async () => {
    const [globals, motion] = await Promise.all([
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
      readFile(
        new URL("../components/storefront-motion.tsx", import.meta.url),
        "utf8",
      ),
    ]);
    const mobileLogoRules = globals.match(
      /@media \(max-width: 639px\) \{([\s\S]*?)\n\}\n\n\.product-card-flat/u,
    );

    assert.ok(mobileLogoRules?.[1], "mobile logo rules must exist");
    assert.match(
      mobileLogoRules[1],
      /\.aura-header-logo__icon\s*\{[\s\S]*display:\s*none;/u,
    );
    assert.match(
      mobileLogoRules[1],
      /\.aura-header-logo__wordmark\s*\{[\s\S]*scale\(1\);/u,
    );
    assert.match(motion, /showExpandedLogo:\s*"\(min-width: 640px\)"/u);
    assert.match(motion, /context\.conditions\?\.showExpandedLogo/u);
  });
});
