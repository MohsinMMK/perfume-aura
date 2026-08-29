import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const repositoryRoot = process.env.CATALOG_REPOSITORY_ROOT
  ? path.resolve(process.env.CATALOG_REPOSITORY_ROOT)
  : path.resolve(import.meta.dirname, "..");
const workbookPath = path.join(repositoryRoot, "docs/review-packets/2026-08-29-b02-114-product-catalog-intake.xlsx");
const outputDirectory = process.env.CATALOG_WORKBOOK_OUTPUT_DIR ?? "/tmp/perfume-aura-catalog-workbook";
const exportPath = process.env.CATALOG_WORKBOOK_EXPORT_PATH;
const mode = process.argv[2] ?? "inspect";

await fs.mkdir(outputDirectory, { recursive: true });
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((value) => value !== ""));
}

if (mode === "update") {
  if (!exportPath) {
    throw new Error("CATALOG_WORKBOOK_EXPORT_PATH is required in update mode");
  }
  const parsedProducts = parseCsv(
    await fs.readFile(path.join(repositoryRoot, "data/catalog/launch-products.csv"), "utf8"),
  );
  const header = parsedProducts[0];
  const productRows = parsedProducts.slice(1).map((values) =>
    Object.fromEntries(header.map((column, index) => [column, values[index] ?? ""])),
  );
  if (productRows.length !== 114) {
    throw new Error(`Expected 114 launch products, received ${productRows.length}`);
  }

  const startHere = workbook.worksheets.getItem("Start Here");
  startHere.getRange("B3:B4").values = [
    ["114 replacement-source products: 79 Inspired + 15 Unknown + 20 Signature"],
    ["322: 237 Inspired + 45 Unknown + 40 Signature"],
  ];
  startHere.getRange("A17").values = [[
    "4. All 114 replacement-source products are included. The temporary Unknown section preserves 15 supplied literal names without invented brand mappings; legal treatment and permanent section naming remain pending.",
  ]];
  startHere.getRange("A20").values = [[
    "Sources: docs/review-packets/2026-08-29-b01-114-name-review.csv; docs/review-packets/2026-08-29-b03-49-name-reconciliation.md; data/catalog/2026-08-29-name-reconciliation.json; data/catalog/launch-products.csv; data/catalog/launch-variants.csv",
  ]];

  const products = workbook.worksheets.getItem("Products");
  products.getRange("B2:C115").values = productRows.map((product) => [
    product.source_name,
    product.public_name_slug,
  ]);
  products.getRange("G2:H115").values = productRows.map((product) => [
    product.public_name,
    product.public_name_slug,
  ]);

  await fs.mkdir(path.dirname(exportPath), { recursive: true });
  const exported = await SpreadsheetFile.exportXlsx(workbook);
  await exported.save(exportPath);
  console.log(`Updated workbook saved to ${exportPath}`);
}

const overview = await workbook.inspect({ kind: "workbook,sheet,table", maxChars: 12000, tableMaxRows: 6, tableMaxCols: 12 });
console.log(overview.ndjson);

const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(formulaErrors.ndjson);

const sheets = JSON.parse(`[${overview.ndjson.trim().split("\n").filter(Boolean).join(",")}]`)
  .filter((record) => record.kind === "sheet")
  .map((record) => record.name);
for (const sheetName of sheets) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDirectory, `${sheetName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`), new Uint8Array(await preview.arrayBuffer()));
}

if (mode !== "inspect" && mode !== "update") {
  throw new Error(`Unsupported mode: ${mode}`);
}
