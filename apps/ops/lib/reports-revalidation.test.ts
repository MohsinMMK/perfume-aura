import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

test("oil receipts and completed sales refresh operations reports", async () => {
  const [oil, sales] = await Promise.all([
    readFile(resolve(currentDirectory, "oil.ts"), "utf8"),
    readFile(resolve(currentDirectory, "sales.ts"), "utf8"),
  ]);

  assert.match(oil, /revalidatePath\("\/reports"\)/);
  assert.match(sales, /revalidatePath\("\/reports"\)/);
});
