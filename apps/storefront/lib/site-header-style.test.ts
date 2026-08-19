import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("storefront header logo", () => {
  it("keeps the desktop navigation large and comfortably clickable", async () => {
    const header = await readFile(
      new URL("../components/site-header.tsx", import.meta.url),
      "utf8",
    );

    assert.match(header, /items-center gap-9[\s\S]*px-5 py-3/u);
    assert.match(header, /min-h-14[\s\S]*text-\[1\.4rem\]/u);
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

  it("drops the complete home logo into place on page load", async () => {
    const [header, globals] = await Promise.all([
      readFile(new URL("../components/site-header.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    ]);

    assert.match(header, /aura-header-logo-enter/u);
    assert.match(globals, /@keyframes aura-header-logo-drop/u);
    assert.match(
      globals,
      /aura-header-logo-drop 700ms cubic-bezier\(0\.16, 1, 0\.3, 1\)[\s\S]*140ms both/u,
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
