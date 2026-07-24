import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const opsRoot = resolve(currentDirectory, "..");

async function tsxFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return tsxFiles(path);
      return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
    }),
  );
  return nested.flat();
}

describe("Phase 05 UI and query contracts", () => {
  it("uses composed Base UI feedback instead of native or legacy shortcuts", async () => {
    const files = [
      ...(await tsxFiles(resolve(opsRoot, "app"))),
      ...(await tsxFiles(resolve(opsRoot, "components"))),
    ];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      assert.doesNotMatch(source, /\b(?:window\.)?(?:confirm|alert)\s*\(/);
      assert.doesNotMatch(source, /\basChild\b/);
      assert.doesNotMatch(source, /\bspace-y-/);
      assert.doesNotMatch(source, /\bnativeButton=\{false\}/);
      if (!file.endsWith("app-sidebar.tsx")) {
        assert.doesNotMatch(
          source,
          /render\s*=\s*\{\s*<Link\b/s,
          `${file} composes a Link through a non-link primitive`,
        );
      }
      assert.doesNotMatch(
        source,
        /<Spinner\b(?![^>]*\bdata-icon=)[^>]*>/s,
        `${file} has a pending spinner without data-icon`,
      );
    }
  });

  it("keeps focused pending Base Buttons in the tab order", async () => {
    const files = [
      ...(await tsxFiles(resolve(opsRoot, "app"))),
      ...(await tsxFiles(resolve(opsRoot, "components"))),
    ];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      const pendingButtons = source.match(
        /<(?:Button|AlertDialogAction)\b[^>]*disabled=\{pending[^>]*>/gs,
      ) ?? [];
      for (const button of pendingButtons) {
        assert.match(
          button,
          /focusableWhenDisabled=\{pending\}/,
          `${file} disables a pending Base Button without preserving focus`,
        );
      }
    }
  });

  it("keeps every growing list bounded and deterministically ordered", async () => {
    const files = await Promise.all(
      ["products.ts", "customers.ts", "invoices.ts", "payments.ts", "stock.ts"].map(
        async (name) => ({
          name,
          source: await readFile(resolve(currentDirectory, name), "utf8"),
        }),
      ),
    );
    for (const file of files) {
      assert.match(file.source, /\.limit\(pageSize\)/, file.name);
      assert.match(file.source, /\.offset\(pageOffset\(page, pageSize\)\)/, file.name);
      assert.match(file.source, /desc\([^)]*\.id\)/, file.name);
    }
  });

  it("uses the purpose-specific low-stock layout query and cached session", async () => {
    const [layout, session] = await Promise.all([
      readFile(resolve(opsRoot, "app/(dashboard)/layout.tsx"), "utf8"),
      readFile(resolve(currentDirectory, "session.ts"), "utf8"),
    ]);
    assert.match(layout, /getLowStockCount/);
    assert.doesNotMatch(layout, /getDashboardStats/);
    assert.match(session, /export const getSession = cache\(/);
  });

  it("paginates invoice-scoped payment history without silently truncating it", async () => {
    const invoiceDetail = await readFile(
      resolve(opsRoot, "app/(dashboard)/invoices/[id]/page.tsx"),
      "utf8",
    );
    assert.match(invoiceDetail, /parsePage\(resolvedSearch\.paymentsPage\)/);
    assert.match(
      invoiceDetail,
      /listPayments\(\{\s*invoiceId:\s*id,\s*page:\s*paymentsPage\s*\}\)/s,
    );
    assert.match(invoiceDetail, /pageParam="paymentsPage"/);
    assert.match(invoiceDetail, /canonicalPage\(/);
    assert.doesNotMatch(
      invoiceDetail,
      /listPayments\(\{\s*invoiceId:\s*id,\s*pageSize:/s,
    );
  });

  it("keeps simultaneously mounted stock labels and controls uniquely associated", async () => {
    const [fieldSource, receiveSource, adjustSource] = await Promise.all([
      readFile(resolve(opsRoot, "components/form-field.tsx"), "utf8"),
      readFile(
        resolve(opsRoot, "components/stock/receive-stock-form.tsx"),
        "utf8",
      ),
      readFile(
        resolve(opsRoot, "components/stock/adjust-stock-form.tsx"),
        "utf8",
      ),
    ]);
    assert.match(fieldSource, /id\?: string/);
    assert.match(fieldSource, /const fieldId = id \?\? name/g);
    assert.match(receiveSource, /name="note"\s+id="receive-note"/s);
    assert.match(adjustSource, /name="note"\s+id="adjust-note"/s);
  });
});
