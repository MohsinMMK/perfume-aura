import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("storefront footer identity", () => {
  it("uses only the supplied SVG icon and wordmark in the brand cell", async () => {
    const footer = await readFile(
      new URL("../components/site-footer.tsx", import.meta.url),
      "utf8",
    );

    assert.match(footer, /src="\/brand\/perfume-aura-icon\.svg"/u);
    assert.match(footer, /src="\/brand\/perfume-aura-wordmark\.svg"/u);
    assert.doesNotMatch(footer, /India · composed for presence/u);
    assert.doesNotMatch(footer, />PERFUME<|>AURA</u);
  });

  it("separates footer navigation rows and reveals a filled play marker", async () => {
    const footer = await readFile(
      new URL("../components/site-footer.tsx", import.meta.url),
      "utf8",
    );

    assert.match(footer, /border-b border-dashed[\s\S]*last:border-b-0/u);
    assert.match(footer, /aria-label="Footer navigation" className="grid content-center"/u);
    assert.match(footer, /<div className="border-y border-dashed/u);
    assert.doesNotMatch(footer, /aria-label="Footer navigation"[^>]*p-6/u);
    assert.match(footer, /min-h-12[\s\S]*font-display text-lg/u);
    assert.match(footer, /group-hover:mr-3[\s\S]*group-hover:w-3[\s\S]*group-hover:opacity-100/u);
    assert.match(footer, /clip-path:polygon\(12%_0,100%_50%,12%_100%\)/u);
    assert.match(footer, /group-hover:translate-x-1/u);
    assert.match(footer, /hover:text-\[var\(--aura-ivory\)\]/u);
    assert.doesNotMatch(footer, /hover:text-white/u);
  });

  it("runs the unframed footer grid within an eight-pixel edge inset", async () => {
    const footer = await readFile(
      new URL("../components/site-footer.tsx", import.meta.url),
      "utf8",
    );

    assert.match(footer, /grid w-full gap-3/u);
    assert.match(footer, /<footer[^>]*px-2/u);
    assert.doesNotMatch(footer, /max-w-\[94rem\]/u);
    assert.doesNotMatch(footer, /<footer[^>]*px-\[var\(--aura-gutter\)\]/u);
    assert.doesNotMatch(footer, /<footer[^>]*border-t/u);
    assert.doesNotMatch(footer, /grid w-full border-y/u);
  });

  it("separates the copyright, policy, and maker row with one dashed rule", async () => {
    const footer = await readFile(
      new URL("../components/site-footer.tsx", import.meta.url),
      "utf8",
    );

    assert.match(
      footer,
      /mt-3 grid w-full[\s\S]*border-t border-dashed[\s\S]*pt-3/u,
    );
  });

  it("keeps only the logo dashed and account actions independently solid", async () => {
    const footer = await readFile(
      new URL("../components/site-footer.tsx", import.meta.url),
      "utf8",
    );

    assert.match(footer, /place-items-center rounded-\[var\(--aura-radius\)\] border border-dashed/u);
    assert.match(footer, /grid grid-cols-2 gap-2/u);
    assert.match(footer, /href="\/account"[\s\S]*rounded-\[var\(--aura-radius\)\] border/u);
    assert.match(footer, /href="\/search"[\s\S]*rounded-\[var\(--aura-radius\)\] border/u);
    assert.match(footer, /href="\/account"[^>]*border-\[color:rgb\(245_228_199_\/_55%\)\]/u);
    assert.match(footer, /href="\/search"[^>]*border-\[color:rgb\(245_228_199_\/_55%\)\]/u);
    assert.doesNotMatch(footer, /lg:border-r|lg:border-b|border-r/u);
  });

  it("keeps the footer compact and aligns the Aura list to the top rule", async () => {
    const footer = await readFile(
      new URL("../components/site-footer.tsx", import.meta.url),
      "utf8",
    );

    assert.match(footer, /<footer[^>]*pt-2/u);
    assert.match(footer, /grid min-h-44[\s\S]*p-5/u);
    assert.match(footer, /<div data-footer-aura-list>[\s\S]*Join the Aura list/u);
    assert.doesNotMatch(footer, /data-footer-aura-list[^>]*className/u);
  });

  it("reveals the supplied Khanect AI mark from above as its credit label exits below", async () => {
    const footer = await readFile(
      new URL("../components/site-footer.tsx", import.meta.url),
      "utf8",
    );

    assert.match(footer, /href="https:\/\/khanect\.com"/u);
    assert.match(footer, /aria-label="Website by Khanect AI"/u);
    assert.match(footer, /min-h-11[^"]*justify-self-end/u);
    assert.match(footer, /group-hover:translate-y-\[140%\]/u);
    assert.match(footer, /group-focus-visible:translate-y-\[140%\]/u);
    assert.match(footer, /-translate-y-\[140%\][\s\S]*group-hover:translate-y-0/u);
    assert.match(footer, /group-focus-visible:translate-y-0/u);
    assert.match(footer, /src="\/brand\/khanect-ai-mark\.svg"/u);
    assert.match(footer, /motion-reduce:transition-none/u);
  });
});
