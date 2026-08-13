import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("storefront header logo", () => {
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
});
