import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

test("top product reporting is based on fulfilled stock movements", async () => {
  const [report, page] = await Promise.all([
    readFile(resolve(currentDirectory, "reports.ts"), "utf8"),
    readFile(
      resolve(currentDirectory, "../app/(dashboard)/reports/page.tsx"),
      "utf8",
    ),
  ]);

  assert.match(
    report,
    /productName: products\.name,[\s\S]*?sizeMl: productVariants\.sizeMl,[\s\S]*?\.from\(stockMovements\)[\s\S]*?stockMovements\.type} = 'sale'/,
  );
  assert.match(report, /sum\(abs\(\$\{stockMovements\.quantityDelta\}\)\)/);
  assert.doesNotMatch(report, /invoiceLines/);
  assert.match(page, /gross fulfilled bottles; returns are tracked separately above/i);
});
