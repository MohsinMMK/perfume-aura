import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createFragranceGuideStructuredData,
  createHomeStructuredData,
  discoverySitemapEntries,
  getStorefrontOrigin,
  privateCrawlerPaths,
  serializeJsonLd,
} from "./seo";

describe("storefront SEO contracts", () => {
  it("normalizes the configured storefront URL to its origin", () => {
    assert.equal(
      getStorefrontOrigin("https://perfumeaura.com/a/path?ignored=true"),
      "https://perfumeaura.com",
    );
  });

  it("keeps the discovery sitemap focused on truthful evergreen pages", () => {
    assert.deepEqual(
      discoverySitemapEntries.map((entry) => entry.path),
      ["", "/fragrance-guide", "/about", "/faq"],
    );
    assert.ok(privateCrawlerPaths.includes("/account"));
    assert.ok(privateCrawlerPaths.includes("/account/"));
    assert.ok(privateCrawlerPaths.includes("/api/"));
    const discoveryPaths = new Set<string>(
      discoverySitemapEntries.map((entry) => entry.path),
    );
    assert.ok(!discoveryPaths.has("/shop"));
  });

  it("publishes one consistent organization identity across structured data", () => {
    const origin = "https://perfumeaura.com";
    const home = createHomeStructuredData(origin);
    const guide = createFragranceGuideStructuredData(origin);
    assert.equal(home["@graph"][0]["@type"], "Organization");
    assert.equal(home["@graph"][0]["@id"], `${origin}/#organization`);
    assert.equal(guide["@graph"][0].author["@id"], `${origin}/#organization`);
    assert.equal(guide["@graph"][0].url, `${origin}/fragrance-guide`);
  });

  it("escapes markup-significant characters in JSON-LD", () => {
    assert.equal(
      serializeJsonLd({ value: "</script><script>" }),
      '{"value":"\\u003c/script>\\u003cscript>"}',
    );
  });
});
