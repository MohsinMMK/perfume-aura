import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const readStorefrontFile = (relativePath: string) =>
  readFile(fileURLToPath(new URL(relativePath, import.meta.url)));

test("the homepage uses lightweight interactive perfumery ingredient cutouts", async () => {
  const [component, homepage, ...assets] = await Promise.all([
    readStorefrontFile("../components/ingredient-atmosphere.tsx").then((file) =>
      file.toString("utf8"),
    ),
    readStorefrontFile("../app/page.tsx").then((file) => file.toString("utf8")),
    readStorefrontFile("../public/images/ingredient-bergamot.webp"),
    readStorefrontFile("../public/images/ingredient-jasmine.webp"),
    readStorefrontFile("../public/images/ingredient-oud.webp"),
    readStorefrontFile("../public/images/ingredient-vanilla.webp"),
  ]);

  assets.forEach((asset) => {
    assert.equal(asset.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(asset.subarray(8, 12).toString("ascii"), "WEBP");
    assert.notEqual(asset.indexOf(Buffer.from("ALPH")), -1);
  });

  assert.match(component, /ingredient-bergamot\.webp/);
  assert.match(component, /ingredient-jasmine\.webp/);
  assert.match(component, /ingredient-oud\.webp/);
  assert.match(component, /ingredient-vanilla\.webp/);
  assert.match(component, /data-ingredient-item/);
  assert.match(component, /data-motion-ingredient-drift/);
  assert.match(component, /state\.owner\.addEventListener\("pointermove"/);
  assert.match(component, /state\.owner\.removeEventListener\("pointermove"/);
  assert.match(component, /requestAnimationFrame\(render\)/);
  assert.match(component, /prefers-reduced-motion: reduce/);
  assert.match(component, /cancelAnimationFrame\(state\.frame\)/);
  assert.match(component, /const resetImmediately/);
  assert.match(component, /state\.layer\.style\.removeProperty\("transform"\)/);
  assert.match(component, /motionStates\.forEach\(resetImmediately\)/);
  assert.match(homepage, /<IngredientAtmosphere\s*\/>/);
  assert.doesNotMatch(homepage, /OudVolumetricModel/);
});
