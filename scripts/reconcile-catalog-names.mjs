import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reconciliationPath = path.join(repositoryRoot, "data/catalog/2026-08-29-name-reconciliation.json");

function parseCsv(input) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (value || row.length > 0) {
    row.push(value.replace(/\r$/u, ""));
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((cell) => cell !== ""));
}

function csvRecords(input) {
  const [header, ...rows] = parseCsv(input);
  return {
    header,
    records: rows.map((row) => Object.fromEntries(header.map((column, index) => [column, row[index] ?? ""]))),
  };
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/u.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function serializeCsv(header, records) {
  return `${[header, ...records.map((record) => header.map((column) => record[column] ?? ""))]
    .map((row) => row.map(csvCell).join(","))
    .join("\n")}\n`;
}

function listingTitle(brand, reference) {
  const cleanedReference = reference.replace(/\s+family$/iu, "").trim();
  return cleanedReference.toLowerCase().startsWith(brand.toLowerCase())
    ? `Inspired by ${cleanedReference}`
    : `Inspired by ${brand} ${cleanedReference}`;
}

function listingSlug(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

const reconciliation = JSON.parse(await readFile(reconciliationPath, "utf8"));
const reconciliationByKey = new Map(reconciliation.records.map((record) => [record.sourceKey, record]));
if (reconciliationByKey.size !== 49) {
  throw new Error(`Expected 49 reconciliation rows, received ${reconciliationByKey.size}`);
}

const launchProductFile = path.join(repositoryRoot, "data/catalog/launch-products.csv");
const perfumeFile = path.join(repositoryRoot, "data/catalog/perfumes.csv");
const nameReviewFile = path.join(repositoryRoot, "docs/review-packets/2026-08-29-b01-114-name-review.csv");
const referenceFile = path.join(repositoryRoot, "docs/REFERENCE.md");

const [launchProductText, perfumeText, nameReviewText, referenceText] = await Promise.all([
  readFile(launchProductFile, "utf8"),
  readFile(perfumeFile, "utf8"),
  readFile(nameReviewFile, "utf8"),
  readFile(referenceFile, "utf8"),
]);
const launchProducts = csvRecords(launchProductText);
const perfumes = csvRecords(perfumeText);
const nameReview = csvRecords(nameReviewText);

for (const product of launchProducts.records) {
  const record = reconciliationByKey.get(product.source_key);
  if (!record) continue;
  if (record.classification === "inspired") {
    product.public_name = listingTitle(record.referenceBrand, record.referenceFragrance);
    product.public_name_slug = listingSlug(product.public_name);
    product.name_approval_status = "listing_title_recorded";
    product.collection = "inspired_collection";
    product.identity_type = "inspired_fragrance";
    product.source_name_review_status = "research_reconciled";
    product.reference_brand = record.referenceBrand;
    product.reference_fragrance = record.referenceFragrance;
    product.reference_mapping_status = "owner_approved_title_reference";
    product.reference_display_status = "planned_public_pending_review";
    product.legal_review_status = "india_counsel_pending";
  } else {
    product.public_name = product.source_name;
    product.public_name_slug = listingSlug(product.source_name);
    product.name_approval_status = "owner_directed_temporary_name";
    product.collection = "unknown_collection";
    product.identity_type = "unclassified_fragrance";
    product.source_name_review_status = "research_reconciled_unknown";
    product.reference_brand = "";
    product.reference_fragrance = "";
    product.reference_mapping_status = "not_applicable_unknown";
    product.reference_display_status = "not_applicable";
    product.legal_review_status = "trademark_clearance_pending";
  }
}

const launchByKey = new Map(launchProducts.records.map((product) => [product.source_key, product]));
for (const source of perfumes.records) {
  const key = `${source.source_section}:${source.source_number}`;
  const product = launchByKey.get(key);
  if (!product) continue;
  source.classification_status = product.collection;
}

for (const review of nameReview.records) {
  const product = launchByKey.get(review.source_key);
  if (!product) continue;
  review.category = product.collection;
  review.proposed_public_name = product.public_name;
  review.public_slug = product.public_name_slug;
  review.name_approval_status = product.name_approval_status;
  review.reference_brand = product.reference_brand;
  review.reference_fragrance = product.reference_fragrance;
  review.legal_review_status = product.legal_review_status;
  if (reconciliationByKey.has(review.source_key)) {
    review.evidence_reference = reconciliation.decision;
  }
}

const updatedReferenceLines = referenceText.split("\n").map((line) => {
  if (!/^\|\s*main_list:\d+\s*\|/u.test(line)) return line;
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  if (cells.length !== 11) return line;
  const record = reconciliationByKey.get(cells[0]);
  if (!record) return line;
  const updated = record.classification === "inspired"
    ? [
        cells[0],
        cells[1],
        record.referenceBrand,
        record.referenceFragrance,
        "owner_approved_title_reference",
        record.evidenceUrl ?? "—",
        record.sourceType,
        record.contentSupport,
        reconciliation.auditDate,
        "—",
        reconciliation.decision,
      ]
    : [cells[0], cells[1], "—", "—", "not_applicable_unknown", "—", "—", "—", reconciliation.auditDate, "—", reconciliation.decision];
  return `| ${updated.join(" | ")} |`;
});

let updatedReference = updatedReferenceLines.join("\n")
  .replace("Main/inspired source rows: 94", "Main source rows: 94")
  .replace("Owner-approved title references carried to the replacement rows: 45", "Owner-approved Inspired title references: 79")
  .replace("Owner-approved family mappings with exact detail pending: 4", "Temporary Unknown collection rows: 15")
  .replace("Explicitly unresolved: 1 (`main_list:4`, Green Creed)", "Family/exact mappings still pending: 0")
  .replace("Still needing owner input: 44", "Unresolved mapping rows: 0")
  .replace("Evidence gaps on approved rows: 1 (`main_list:37`)", "Evidence gaps on approved rows: 3 (`main_list:37`, `main_list:74`, `main_list:87`)");

await Promise.all([
  writeFile(launchProductFile, serializeCsv(launchProducts.header, launchProducts.records)),
  writeFile(perfumeFile, serializeCsv(perfumes.header, perfumes.records)),
  writeFile(nameReviewFile, serializeCsv(nameReview.header, nameReview.records)),
  writeFile(referenceFile, updatedReference),
]);

const inspired = reconciliation.records.filter((record) => record.classification === "inspired");
const unknown = reconciliation.records.filter((record) => record.classification === "unknown");
const reportRows = reconciliation.records.map((record) => {
  const product = launchByKey.get(record.sourceKey);
  const evidence = record.evidenceUrl ? `[source](${record.evidenceUrl})` : record.sourceType === "evidence_gap" ? "Evidence gap recorded" : "No single identity selected";
  const result = record.classification === "inspired"
    ? `${product.public_name}`
    : `${product.public_name} (temporary literal name)`;
  return `| ${record.sourceKey} | ${product.source_name} | ${record.classification === "inspired" ? "Inspired" : "Unknown"} | ${result} | ${evidence} | ${record.reason} |`;
});
const report = `# B03 — 49-name catalog reconciliation\n\nAudit date: ${reconciliation.auditDate}. Decision owner: ${reconciliation.decision}.\n\nThis packet records the requested research and classification of the 49 replacement-source names that did not previously have a storefront title. It is identity research and catalog organization, not trademark clearance. Inspired names remain subject to India-counsel review for every intended public surface. Unknown is a temporary collection label and preserves the supplied fragrance name and all supplied prices without inventing a brand.\n\n## Result\n\n- ${inspired.length} rows mapped to Inspired using official or strongest-available identity evidence.\n- ${unknown.length} rows placed in temporary Unknown because the source is generic, brand-only, multi-brand, conflicting, or not exact enough to map safely.\n- Final catalog: 79 Inspired + 15 Unknown + 20 Signature = 114 products.\n- Prices are unchanged: main rows 1–16 retain ₹600/₹800/₹1,400; main rows 17–94 retain ₹450/₹650/₹1,200; Signature retains its supplied 50/105 ml prices.\n\n## Row-by-row review\n\n| Key | Supplied name | Section | Catalog title | Evidence | Research conclusion |\n|---|---|---|---|---|---|\n${reportRows.join("\n")}\n\n## Naming options for the temporary section\n\n- **Aura Originals** — strongest future house-name option if these are confirmed as Perfume Aura-created identities.\n- **Independent Scents** — neutral and useful while brand/reference provenance remains mixed.\n- **Fragrance Collection** — the safest descriptive option when no origin claim should be made.\n\nThe storefront intentionally uses **Unknown** until the owner selects a permanent label.\n`;
await writeFile(path.join(repositoryRoot, "docs/review-packets/2026-08-29-b03-49-name-reconciliation.md"), report);

console.log(`Reconciled ${inspired.length} Inspired and ${unknown.length} Unknown rows.`);
