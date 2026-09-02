import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const readStorefront = (relativePath: string) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

describe("storefront typography contract", () => {
  it("defines the branded font variables on the document root", async () => {
    const [layout, globals] = await Promise.all([
      readStorefront("../app/layout.tsx"),
      readStorefront("../app/globals.css"),
    ]);

    const htmlTag = layout.match(/<html[\s\S]*?>/u)?.[0] ?? "";
    const bodyTag = layout.match(/<body[\s\S]*?>/u)?.[0] ?? "";

    assert.match(htmlTag, /interTight\.variable/u);
    assert.match(htmlTag, /londrinaSolid\.variable/u);
    assert.match(htmlTag, /londrinaOutline\.variable/u);
    assert.doesNotMatch(
      bodyTag,
      /interTight\.variable|londrinaSolid\.variable|londrinaOutline\.variable/u,
    );
    assert.match(globals, /--font-sans:\s*var\(--font-inter-tight\);/u);
    assert.match(globals, /--font-heading:\s*var\(--font-londrina-solid\);/u);
    assert.match(
      globals,
      /--font-heading-outline:\s*var\(--font-londrina-outline\);/u,
    );
    assert.match(globals, /--aura-font-sans:\s*var\(--font-sans\)/u);
    assert.match(globals, /--aura-font-display:\s*var\(--font-heading\)/u);
    assert.match(
      globals,
      /--aura-font-display-outline:\s*var\(--font-heading-outline\)/u,
    );
    assert.match(
      globals,
      /\.text-outline\s*\{[\s\S]*font-family:\s*var\(--aura-font-display-outline\)/u,
    );
    assert.doesNotMatch(globals, /-webkit-text-stroke/u);
  });

  it("loads a real Inter Tight italic and removes the stale Playfair token", async () => {
    const [layout, home] = await Promise.all([
      readStorefront("../app/layout.tsx"),
      readStorefront("../app/page.tsx"),
    ]);

    assert.match(layout, /inter-tight-latin-wght-normal\.woff2/u);
    assert.match(layout, /inter-tight-latin-wght-italic\.woff2/u);
    assert.match(layout, /weight:\s*"100 900",\s*style:\s*"italic"/u);
    assert.doesNotMatch(home, /--font-playfair/u);
    assert.match(
      home,
      /word === "arrival" \? " italic text-\[var\(--aura-brass\)\]"/u,
    );
  });

  it("self-hosts the selected Londrina filled and outline faces", async () => {
    const layout = await readStorefront("../app/layout.tsx");

    assert.match(layout, /londrina-solid-latin-400-normal\.woff2/u);
    assert.match(layout, /londrina-outline-latin-400-normal\.woff2/u);
    assert.doesNotMatch(layout, /bebas-neue/u);
  });
});
