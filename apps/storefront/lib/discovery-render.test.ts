import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FaqPage from "../app/faq/page";
import manifest from "../app/manifest";
import { SiteFooter } from "../components/site-footer";
import { discoverySitemapEntries } from "./seo";
import { faqItems } from "./faq";

it("renders every structured FAQ answer as readable HTML without JavaScript", () => {
  const html = renderToStaticMarkup(createElement(FaqPage));
  const content = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gu, "");
  assert.equal((content.match(/<details\b/gu) ?? []).length, faqItems.length);
  assert.equal((content.match(/<summary\b/gu) ?? []).length, faqItems.length);
  for (const item of faqItems) {
    const escapedAnswer = renderToStaticMarkup(createElement("p", null, item.answer));
    assert.ok(content.includes(escapedAnswer), `Missing HTML answer: ${item.question}`);
  }
  assert.ok(content.includes('href="/fragrance-guide"'));
});

it("uses the exact header bottle geometry for the square favicon", async () => {
  const original = await readFile(new URL("../public/brand/perfume-aura-icon.svg", import.meta.url), "utf8");
  const favicon = await readFile(new URL("../public/favicon.svg", import.meta.url), "utf8");
  assert.equal(favicon.match(/<path\b[^>]*>/u)?.[0], original.match(/<path\b[^>]*>/u)?.[0]);
  assert.match(favicon, /viewBox="0 0 512 512"/u);
  assert.match(favicon, /viewBox="162 206 271 386"/u);
});

it("links every discovery sitemap page directly from the shared footer", () => {
  const footer = renderToStaticMarkup(createElement(SiteFooter));
  for (const entry of discoverySitemapEntries) {
    assert.ok(footer.includes(`href="${entry.path || "/"}"`), `Missing discovery link: ${entry.path}`);
  }
});

it("provides square raster icons and a valid multiresolution browser fallback", async () => {
  const icons = manifest().icons ?? [];
  assert.deepEqual(icons.map((icon) => icon.sizes), ["192x192", "512x512"]);
  for (const [name, size] of [
    ["favicon-96.png", 96],
    ["apple-touch-icon.png", 180],
    ["brand/perfume-aura-icon-192.png", 192],
    ["brand/perfume-aura-icon-512.png", 512],
  ] as const) {
    const png = await readFile(new URL(`../public/${name}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  const ico = await readFile(new URL("../app/favicon.ico", import.meta.url));
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 6);
  for (let index = 0; index < 6; index++) {
    const entry = 6 + index * 16;
    const size = ico[entry] || 256;
    const offset = ico.readUInt32LE(entry + 12);
    const length = ico.readUInt32LE(entry + 8);
    assert.ok(offset + length <= ico.length);
    assert.equal(ico.readUInt32BE(offset + 16), size);
    assert.equal(ico.readUInt32BE(offset + 20), size);
  }
});
