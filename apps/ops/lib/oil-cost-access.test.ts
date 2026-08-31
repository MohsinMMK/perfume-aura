import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

test("oil purchase costs stay behind the owner-only cost capability", async () => {
  const [oil, page, form] = await Promise.all([
    readFile(resolve(currentDirectory, "oil.ts"), "utf8"),
    readFile(
      resolve(currentDirectory, "../app/(dashboard)/stock/oil/page.tsx"),
      "utf8",
    ),
    readFile(
      resolve(currentDirectory, "../components/stock/receive-oil-form.tsx"),
      "utf8",
    ),
  ]);

  assert.match(oil, /hasOpsCapability\(session\.user\.role, "stock\.view-cost"\)/);
  assert.match(
    oil,
    /totalCostCents:\s*canViewCost\s*\?\s*oilLots\.totalCostCents\s*:\s*sql<number \| null>`null::int`/s,
  );
  assert.match(
    oil,
    /data\.totalCost !== undefined && !canViewCost[\s\S]*Only an owner can record purchase costs/s,
  );
  assert.match(page, /canViewCost = hasOpsCapability\(session\.user\.role, "stock\.view-cost"\)/);
  assert.match(page, /canViewCost \? \(\s*<TableHead[^>]*>Cost<\/TableHead>/s);
  assert.match(form, /canViewCost \? \(\s*<FormField[\s\S]*name="totalCost"/s);
});
