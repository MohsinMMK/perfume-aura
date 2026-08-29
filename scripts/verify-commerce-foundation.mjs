import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

function inspiredListingTitle(brand, reference) {
  const cleanedReference = String(reference)
    .replace(/\s+family$/i, "")
    .trim();
  const cleanedBrand = String(brand).trim();
  if (!cleanedBrand || !cleanedReference) {
    throw new Error("Inspired listing titles require a brand and reference");
  }
  if (cleanedReference.toLowerCase().startsWith(cleanedBrand.toLowerCase())) {
    return `Inspired by ${cleanedReference}`;
  }
  return `Inspired by ${cleanedBrand} ${cleanedReference}`;
}

function listingSlug(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepositoryRoot = path.resolve(path.dirname(scriptPath), "..");
const repositoryRoot = process.env.COMMERCE_VERIFY_ROOT
  ? path.resolve(process.env.COMMERCE_VERIFY_ROOT)
  : defaultRepositoryRoot;
const selfTestMode = process.argv.includes("--self-test");

const requiredCommerceDocuments = [
  "docs/COMMERCE.md",
  "docs/REFERENCE.md",
];
const catalogPath = "data/catalog/perfumes.csv";
const launchProductPath = "data/catalog/launch-products.csv";
const launchVariantPath = "data/catalog/launch-variants.csv";
const sourceArtifacts = new Map([
  [
    "data/catalog/source/Perfume_Aura_Premium_Segment_2026-08-29.png",
    "1c6d741ba6231ba5d806cf2044f2bc62d681b0d0c34c6150864ae0abe07fcdcf",
  ],
  [
    "data/catalog/source/Perfume_Aura_Price_List_450_650_1200.pdf",
    "23f945e637a791cef6078029fd4d69f65e1f99bf05f73f6856e4825c349a133e",
  ],
  [
    "data/catalog/source/Perfume_Aura_Signature_Series_2026-08-29.png",
    "69cac3ea92827a3baed7274f9f2c1ce92557a3e9a3333f1291a0d102adacb910",
  ],
]);
const expectedHeader = [
  "source_section",
  "source_number",
  "source_name",
  "public_name",
  "classification_status",
  "launch_status",
  "image_status",
  "review_notes",
];
const expectedLaunchProductHeader = [
  "source_key",
  "source_section",
  "source_number",
  "source_name",
  "public_name",
  "public_name_slug",
  "name_approval_status",
  "collection",
  "identity_type",
  "source_name_review_status",
  "reference_brand",
  "reference_fragrance",
  "reference_mapping_status",
  "reference_display_status",
  "legal_review_status",
  "audience",
  "fragrance_family",
  "top_notes",
  "heart_notes",
  "base_notes",
  "occasion",
  "season",
  "intensity",
  "concentration",
  "longevity_guidance",
  "sillage",
  "ingredients",
  "usage_instructions",
  "image_status",
  "launch_scope",
  "approval_status",
  "review_notes",
];
const expectedLaunchVariantHeader = [
  "source_key",
  "size_ml",
  "variant_type",
  "currency",
  "sku",
  "barcode",
  "retail_price_minor",
  "cost_minor",
  "opening_stock",
  "reorder_level",
  "availability_intent",
  "stock_status",
  "launch_scope",
  "approval_status",
  "review_notes",
];
const expectedRequirementIds = new Set([
  "CAT-001",
  "CAT-002",
  "CAT-003",
  "CAT-004",
  "CAT-005",
  "CAT-006",
  "CAT-007",
  "CAT-008",
  "UX-001",
  "UX-002",
  "UX-003",
  "FIND-001",
  "FIND-002",
  "FIND-003",
  "PDP-001",
  "PDP-002",
  "PDP-003",
  "PDP-004",
  "PDP-005",
  "CART-001",
  "CART-002",
  "CHECK-001",
  "CHECK-002",
  "INV-001",
  "INV-002",
  "ORD-001",
  "ORD-002",
  "PAY-001",
  "PAY-002",
  "PAY-003",
  "AUTH-001",
  "AUTH-002",
  "TRUST-001",
  "TRUST-002",
  "A11Y-001",
  "PERF-001",
  "SEO-001",
  "OPS-001",
  "OPS-002",
  "VER-001",
  "VER-002",
]);
const allowedRequirementStatuses = new Set([
  "Accepted",
  "Proposed",
  "Blocked",
  "Verified",
]);
const allowedDecisionStatuses = new Set([
  "Accepted",
  "Proposed",
  "Pending",
  "Superseded",
]);
const expectedSourceDigest =
  "2ad2260ce293b0337bd92b79f98dba8b01631db4409c139590b7df3372c8460a";
// Canonical approved inspired identities:
// (key, source_name, brand, reference, status, decision)
// Update only with a new COM-ADR citing the replacement digest + deliberate identity change.
const INITIAL_FROZEN_APPROVED_MAPPING_IDENTITY_DIGEST =
  "3701891d6afbaa5c34a7f830749688a420e6498a17d5e19af34b71315db02ded";
// Current authorized digest. Diverge from INITIAL only when a new COM-ADR cites the replacement.
const expectedApprovedMappingIdentityDigest =
  "e248eed86501021ef5b2719aa1db335173c08c531473f1d9a047a02bbc03e864";
const expectedApprovedMappingIdentityAuthorityLine =
  "Approved mapping identity digest `e248eed86501021ef5b2719aa1db335173c08c531473f1d9a047a02bbc03e864` authorized by COM-ADR-033; any replacement digest requires a new COM-ADR row citing that digest before the verifier constant may change.";
const expectedSection29And30ParaphraseBlock =
  "Cautious paraphrase only:\n\n" +
  "- Section 29 addresses infringement of a **registered** trade mark, including likely confusion or association under the statute's conditions.\n" +
  "- Section 29(6) treats specified acts as use of a registered mark, including affixing it to goods or packaging and using it on business papers or in advertising, under the statute's conditions.\n" +
  "- Section 29(8) advertising uses of a mark infringe if the advertising:\n" +
  "  - takes unfair advantage of **and** is contrary to honest practices in industrial or commercial matters; **or**\n" +
  "  - is detrimental to its distinctive character; **or**\n" +
  "  - is against the reputation of the trade mark.\n" +
  "- Section 30(1) identification-type limits apply only when use is in accordance with honest practices in industrial or commercial matters **and** is not such as to take unfair advantage of or be detrimental to the distinctive character or repute of the trade mark. Sections 30(1)(a) and 30(1)(b) are cumulative and fact-dependent.\n" +
  "- Neither section creates automatic clearance for `Inspired by` titles, packaging references, metadata, ads, or any other surface. Repository documentation cannot determine whether a proposed perfume reference qualifies.\n" +
  "- A non-affiliation disclaimer is not a statutory safe harbor.\n" +
  "- Competitor behavior is not government guidance and is not proof of permission or absence of disputes.";

const expectedComAdr022Decision =
  "Keep designer and inspired-reference names disabled on bottle labels and packaging until separate explicit owner approval and India-counsel approval for that surface.";
const expectedComAdr022Reason =
  "Owner-selected fail-closed product policy after REQUIREMENTS and RESEARCH conflicted on bottle-label readiness. This is packaging/surface control only. It is not trademark clearance, disclaimer approval, title clearance, or permission to use references on any other surface.";
const requiredComAdr023FieldSupersession =
  /Field-level supersession rules: COM-ADR-027 replaces only COM-ADR-023's\s+temporary `shop\.perfumeaura\.com` staging-domain field\. COM-ADR-023's separate\s+storefront application, shared Neon source of truth, and private ops boundary\s+remain accepted\./;
const requiredComAdr030Supersession =
  /COM-ADR-030 fully replaces COM-ADR-025\. Anonymous browsing and\s+cart creation, separate customer identity, configurable shipping, and manual\s+courier remain; guest checkout, COD, and Apple launch sign-in are no longer\s+selected launch requirements\./;
const forbiddenLegalContradictionPattern =
  /either unfair advantage or conduct contrary|paragraphs are alternatives|grants legal clearance for public titles|permits reference use on PDP copy|permission to use references on every surface|grants trademark clearance/i;
const requiredReviewFlags = new Set();
const retailerExceptionKeys = new Set(["main_list:35"]);
const evidenceGapKeys = new Set([
  "main_list:37",
  "main_list:74",
  "main_list:87",
]);
const knownRetailerHostPatterns = [
  /(^|\.)ulta\.com$/i,
  /(^|\.)sephora\.com$/i,
  /(^|\.)nordstrom\.com$/i,
  /(^|\.)amazon\./i,
  /(^|\.)flipkart\./i,
  /(^|\.)nykaa\./i,
  /(^|\.)walmart\./i,
];
const forbiddenEvidenceHostPatterns = [/(^|\.)carolinaherreras\.com$/i];
const officialHostsByBrand = new Map([
  ["Ahmed Al Maghribi", ["www.ahmedalmaghribi.us"]],
  ["Ajmal", ["en-ae.ajmal.com"]],
  ["Al-Rehab", ["alrehab.com"]],
  ["Armaf", ["armaf.com"]],
  ["Azzaro", ["www.azzaro.com"]],
  ["Burberry", ["us.burberry.com"]],
  ["Bvlgari", ["www.bulgari.com"]],
  ["Calvin Klein", ["www.calvinklein.us"]],
  ["Carolina Herrera", ["www.carolinaherrera.com"]],
  ["Chanel", ["www.chanel.com"]],
  ["Creed", ["creedboutique.com"]],
  ["Cristiano Ronaldo", ["cristianoronaldo.com"]],
  ["Davidoff", ["www.zinodavidoff.com"]],
  ["Dior", ["www.dior.com"]],
  ["Diptyque", ["us.diptyqueparis.com"]],
  ["Dunhill", ["www.dunhill.com"]],
  ["Emporio Armani", ["www.armani.com"]],
  ["Giorgio Armani", ["www.giorgioarmanibeauty-usa.com"]],
  ["Gissah", ["qa.gissah.com"]],
  ["Gucci", ["www.gucci.com"]],
  ["Hermès", ["www.hermes.com"]],
  ["Jean Paul Gaultier", ["www.jeanpaulgaultier.com"]],
  ["Jimmy Choo", ["us.jimmychoo.com"]],
  ["Lattafa", ["lattafa.com", "www.lattafa-usa.com"]],
  ["Louis Vuitton", ["us.louisvuitton.com"]],
  ["Maison Francis Kurkdjian", ["www.franciskurkdjian.com"]],
  ["Narciso Rodriguez", ["www.narcisorodriguezparfums.com"]],
  ["Nasomatto", ["nasomatto.com"]],
  ["Parfums de Marly", ["us.parfums-de-marly.com"]],
  ["Prada", ["www.prada-beauty.com"]],
  ["Rabanne", ["www.rabanne.com"]],
  [
    "Ralph Lauren",
    [
      "www.ralphlauren.com",
      "corporate.ralphlauren.com",
      "investor.ralphlauren.com",
    ],
  ],
  ["Rasasi", ["store.rasasi.com.sa"]],
  ["Roja Parfums", ["www.rojaparfums.com", "www.rojalondon.com"]],
  ["Tom Ford", ["www.tomfordbeauty.com"]],
  ["Versace", ["www.versace.com"]],
  ["Victoria's Secret", ["www.victoriassecret.com"]],
  ["Viktor&Rolf", ["us.viktor-rolf.com"]],
  ["Xerjoff", ["www.xerjoff.com"]],
  ["Yves Saint Laurent", ["www.yslbeauty.com", "www.yslbeautyus.com"]],
]);

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
      continue;
    }

    if (character === '"') {
      assert.equal(field, "", "quote must start at beginning of CSV field");
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

  assert.equal(quoted, false, "CSV contains unterminated quoted field");
  if (field !== "" || row.length > 0) {
    row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
    rows.push(row);
  }

  return rows.filter(
    (candidate) =>
      candidate.length > 1 || (candidate.length === 1 && candidate[0] !== ""),
  );
}

function assertSequential(rows, expectedMaximum, section) {
  const numbers = rows.map((row) => Number(row.source_number));
  assert.deepEqual(
    numbers,
    Array.from({ length: expectedMaximum }, (_, index) => index + 1),
    `${section} source numbers must be exactly 1-${expectedMaximum}`,
  );
}

function assertCalendarDate(value, label) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${label} must use YYYY-MM-DD`);
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const utc = new Date(Date.UTC(year, month - 1, day));
  assert.equal(
    utc.getUTCFullYear() === year &&
      utc.getUTCMonth() + 1 === month &&
      utc.getUTCDate() === day,
    true,
    `${label} must be a real calendar date`,
  );
}

function hostnameMatches(hostname, allowedHost) {
  // Exact audited hostname only — no arbitrary descendant subdomain wildcards.
  return hostname.toLowerCase() === allowedHost.toLowerCase();
}

function isKnownRetailerHost(hostname) {
  return knownRetailerHostPatterns.some((pattern) => pattern.test(hostname));
}

function parseHttpsUrl(value, key, fieldName) {
  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    assert.fail(`${key} ${fieldName} must be a valid URL`);
  }
  assert.equal(parsedUrl.protocol, "https:", `${key} ${fieldName} must use https`);
  assert.ok(parsedUrl.hostname, `${key} ${fieldName} must include a hostname`);
  return parsedUrl;
}

function assertEvidenceUrlConstraints({
  value,
  key,
  fieldName,
  brand,
  fragrance,
  sourceType,
}) {
  const parsedUrl = parseHttpsUrl(value, key, fieldName);
  for (const pattern of forbiddenEvidenceHostPatterns) {
    assert.equal(
      pattern.test(parsedUrl.hostname),
      false,
      `${key} ${fieldName} uses forbidden/invalid host ${parsedUrl.hostname}`,
    );
  }
  if (/212\s*VIP\s*Men/i.test(fragrance)) {
    assert.equal(
      /212-vip-black/i.test(parsedUrl.pathname),
      false,
      `${key} ${fieldName} path identifies VIP Black, not 212 VIP Men`,
    );
  }

  const retailerHost = isKnownRetailerHost(parsedUrl.hostname);
  if (sourceType === "official_brand" || sourceType === "official_regional") {
    assert.equal(
      retailerHost,
      false,
      `${key} ${fieldName} official evidence cannot use known retailer host ${parsedUrl.hostname}`,
    );
    const allowedHosts = officialHostsByBrand.get(brand) ?? [];
    assert.ok(
      allowedHosts.some((allowedHost) =>
        hostnameMatches(parsedUrl.hostname, allowedHost),
      ),
      `${key} ${fieldName} host ${parsedUrl.hostname} is not an audited official host for ${brand}`,
    );
  } else if (sourceType === "retailer") {
    assert.ok(
      retailerHost,
      `${key} ${fieldName} retailer evidence must use a known retailer host`,
    );
  }

  return parsedUrl;
}

async function assertRelativeMarkdownLinks(markdownPath) {
  const absolutePath = path.join(repositoryRoot, markdownPath);
  const markdown = await readFile(absolutePath, "utf8");
  const targets = [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(
    (match) => match[1],
  );

  for (const rawTarget of targets) {
    if (
      rawTarget.startsWith("http://") ||
      rawTarget.startsWith("https://") ||
      rawTarget.startsWith("mailto:") ||
      rawTarget.startsWith("#")
    ) {
      continue;
    }

    const target = decodeURIComponent(rawTarget.split("#", 1)[0]);
    assert.ok(target, `${markdownPath} contains an empty relative link target`);
    await assert.doesNotReject(
      access(path.resolve(path.dirname(absolutePath), target)),
      `${markdownPath} has broken relative link: ${rawTarget}`,
    );
  }
}

function assertSectionMarkers(content, documentPath, namespace, sections) {
  for (const section of sections) {
    const start = `<!-- ${namespace}:${section}:start -->`;
    const end = `<!-- ${namespace}:${section}:end -->`;
    assert.equal(
      content.split(start).length - 1,
      1,
      `${documentPath} must contain exactly one ${start} marker`,
    );
    assert.equal(
      content.split(end).length - 1,
      1,
      `${documentPath} must contain exactly one ${end} marker`,
    );
    assert.ok(
      content.indexOf(start) < content.indexOf(end),
      `${documentPath} has inverted markers for ${section}`,
    );
  }
}

function replaceOnce(content, search, replacement, label) {
  assert.equal(
    content.includes(search),
    true,
    `${label} mutation target missing`,
  );
  return content.replace(search, replacement);
}

async function runSelfTests() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "commerce-verify-"));
  const copyPairs = [
    ["docs/COMMERCE.md", "docs/COMMERCE.md"],
    ["docs/REFERENCE.md", "docs/REFERENCE.md"],
    ["docs/CURRENT_STATE.md", "docs/CURRENT_STATE.md"],
    ["docs/PRODUCT.md", "docs/PRODUCT.md"],
    ["docs/ENGINEERING.md", "docs/ENGINEERING.md"],
    ["docs/OPERATIONS.md", "docs/OPERATIONS.md"],
    ["docs/BLOCKERS.md", "docs/BLOCKERS.md"],
    ["data/catalog", "data/catalog"],
    ["README.md", "README.md"],
    ["AGENTS.md", "AGENTS.md"],
  ];

  const materializeCaseRoot = async () => {
    const caseRoot = await mkdtemp(path.join(tempRoot, "case-"));
    for (const [fromRelative, toRelative] of copyPairs) {
      const destination = path.join(caseRoot, toRelative);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(path.join(tempRoot, toRelative), destination, {
        recursive: true,
      });
    }
    return caseRoot;
  };

  const runVerifier = (root, script = scriptPath) =>
    spawnSync(process.execPath, [script], {
      env: {
        ...process.env,
        COMMERCE_VERIFY_ROOT: root,
      },
      encoding: "utf8",
    });

  try {
    for (const [fromRelative, toRelative] of copyPairs) {
      const destination = path.join(tempRoot, toRelative);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(path.join(defaultRepositoryRoot, fromRelative), destination, {
        recursive: true,
      });
    }

    const baselineRoot = await materializeCaseRoot();
    const baseline = runVerifier(baselineRoot);
    assert.equal(
      baseline.status,
      0,
      `self-test baseline fixture must pass before mutations:\n${baseline.stdout}\n${baseline.stderr}`,
    );

    const cases = [];
    const runAgainst = async (label, mutate, expectedDiagnostic) => {
      const caseRoot = await materializeCaseRoot();
      const scriptOverride = await mutate(caseRoot);
      const result = runVerifier(caseRoot, scriptOverride || scriptPath);
      const output = `${result.stdout}\n${result.stderr}`;
      assert.notEqual(
        result.status,
        0,
        `${label} mutation must fail verification`,
      );
      const matched =
        typeof expectedDiagnostic === "string"
          ? output.includes(expectedDiagnostic)
          : expectedDiagnostic.test(output);
      assert.ok(
        matched,
        `${label} must fail for expected diagnostic ${expectedDiagnostic}\n${output}`,
      );
      cases.push(label);
      return label;
    };

    await runAgainst(
      "coordinated-identity-rewrite",
      async (root) => {
        const registerPath = path.join(root, "docs/REFERENCE.md");
        const launchPath = path.join(root, launchProductPath);
        let register = await readFile(registerPath, "utf8");
        register = replaceOnce(
          register,
          "| main_list:1 | Bvlgari Tygar | Bvlgari | Tygar | owner_approved_title_reference |",
          "| main_list:1 | Bvlgari Tygar | Acme | Altered Identity | owner_approved_title_reference |",
          "register identity",
        );
        await writeFile(registerPath, register);
        let launch = await readFile(launchPath, "utf8");
        launch = replaceOnce(
          launch,
          "main_list:1,main_list,1,Bvlgari Tygar,Inspired by Bvlgari Tygar,inspired-by-bvlgari-tygar,listing_title_recorded,inspired_collection,inspired_fragrance,not_flagged,Bvlgari,Tygar,owner_approved_title_reference,",
          "main_list:1,main_list,1,Bvlgari Tygar,Inspired by Bvlgari Tygar,inspired-by-bvlgari-tygar,listing_title_recorded,inspired_collection,inspired_fragrance,not_flagged,Acme,Altered Identity,owner_approved_title_reference,",
          "launch identity",
        );
        await writeFile(launchPath, launch);
      },
      "approved mapping identities changed",
    );

    await runAgainst(
      "second-retailer-row",
      async (root) => {
        const registerPath = path.join(root, "docs/REFERENCE.md");
        let register = await readFile(registerPath, "utf8");
        register = replaceOnce(
          register,
          "| main_list:5 | Creed Aventus | Creed | Aventus | owner_approved_title_reference | https://creedboutique.com/products/aventus | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |",
          "| main_list:5 | Creed Aventus | Creed | Aventus | owner_approved_title_reference | https://www.sephora.com/product/aventus | retailer | confirmed | 2026-07-30 | — | COM-ADR-021 |",
          "second retailer",
        );
        await writeFile(registerPath, register);
      },
      "not an authorized retailer exception key",
    );

    await runAgainst(
      "retailer-effective-url-on-official",
      async (root) => {
        const registerPath = path.join(root, "docs/REFERENCE.md");
        let register = await readFile(registerPath, "utf8");
        register = replaceOnce(
          register,
          "| main_list:5 | Creed Aventus | Creed | Aventus | owner_approved_title_reference | https://creedboutique.com/products/aventus | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |",
          "| main_list:5 | Creed Aventus | Creed | Aventus | owner_approved_title_reference | https://creedboutique.com/products/aventus | official_brand | confirmed | 2026-07-30 | https://www.ulta.com/p/fake | COM-ADR-021 |",
          "retailer effective",
        );
        await writeFile(registerPath, register);
      },
      "official evidence cannot use known retailer host",
    );

    await runAgainst(
      "unapproved-official-host",
      async (root) => {
        const registerPath = path.join(root, "docs/REFERENCE.md");
        let register = await readFile(registerPath, "utf8");
        register = replaceOnce(
          register,
          "| main_list:5 | Creed Aventus | Creed | Aventus | owner_approved_title_reference | https://creedboutique.com/products/aventus | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |",
          "| main_list:5 | Creed Aventus | Creed | Aventus | owner_approved_title_reference | https://www.walmart.com/ip/aventus | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |",
          "walmart official",
        );
        await writeFile(registerPath, register);
      },
      "official evidence cannot use known retailer host",
    );

    await runAgainst(
      "unreviewed-subdomain-host",
      async (root) => {
        const registerPath = path.join(root, "docs/REFERENCE.md");
        let register = await readFile(registerPath, "utf8");
        register = replaceOnce(
          register,
          "| main_list:5 | Creed Aventus | Creed | Aventus | owner_approved_title_reference | https://creedboutique.com/products/aventus | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |",
          "| main_list:5 | Creed Aventus | Creed | Aventus | owner_approved_title_reference | https://unreviewed.creedboutique.com/products/aventus | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |",
          "unreviewed subdomain",
        );
        await writeFile(registerPath, register);
      },
      "not an audited official host",
    );

    await runAgainst(
      "cross-row-original-url-reuse",
      async (root) => {
        const registerPath = path.join(root, "docs/REFERENCE.md");
        let register = await readFile(registerPath, "utf8");
        register = replaceOnce(
          register,
          "| main_list:67 | Tom Ford Tobacco Vanille | Tom Ford | Tobacco Vanille | owner_approved_title_reference | https://www.tomfordbeauty.com/products/tobacco-vanille-eau-de-parfum | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |",
          "| main_list:67 | Tom Ford Tobacco Vanille | Tom Ford | Tobacco Vanille | owner_approved_title_reference | https://www.tomfordbeauty.com/products/black-orchid-eau-de-parfum | official_brand | confirmed | 2026-07-30 | https://www.tomfordbeauty.com/products/tobacco-vanille-unique-effective | COM-ADR-021 |",
          "cross-row original url",
        );
        await writeFile(registerPath, register);
      },
      "reuses URL already claimed by",
    );

    await runAgainst(
      "invalid-calendar-date",
      async (root) => {
        const registerPath = path.join(root, "docs/REFERENCE.md");
        let register = await readFile(registerPath, "utf8");
        register = replaceOnce(
          register,
          "| main_list:5 | Creed Aventus | Creed | Aventus | owner_approved_title_reference | https://creedboutique.com/products/aventus | official_brand | confirmed | 2026-07-30 | — | COM-ADR-021 |",
          "| main_list:5 | Creed Aventus | Creed | Aventus | owner_approved_title_reference | https://creedboutique.com/products/aventus | official_brand | confirmed | 2026-99-99 | — | COM-ADR-021 |",
          "bad audit date",
        );
        await writeFile(registerPath, register);
      },
      "must be a real calendar date",
    );

    await runAgainst(
      "bad-section-30-wording",
      async (root) => {
        const researchPath = path.join(root, "docs/REFERENCE.md");
        let research = await readFile(researchPath, "utf8");
        research = replaceOnce(
          research,
          "is not such as to take unfair advantage of or be detrimental to the distinctive character or repute of the trade mark",
          "does not take unfair advantage of, or is not detrimental to, the distinctive character or repute of the trade mark",
          "section 30 wording",
        );
        await writeFile(researchPath, research);
      },
      "exact-locked Section 29/30 statutory paraphrase block",
    );

    await runAgainst(
      "bad-section-29-8-wording",
      async (root) => {
        const researchPath = path.join(root, "docs/REFERENCE.md");
        let research = await readFile(researchPath, "utf8");
        research = replaceOnce(
          research,
          "takes unfair advantage of **and** is contrary to honest practices in industrial or commercial matters; **or**",
          "takes unfair advantage of distinctive character or repute; **or**",
          "section 29(8) wording",
        );
        await writeFile(researchPath, research);
      },
      "exact-locked Section 29/30 statutory paraphrase block",
    );

    await runAgainst(
      "append-section-30-contradiction",
      async (root) => {
        const researchPath = path.join(root, "docs/REFERENCE.md");
        let research = await readFile(researchPath, "utf8");
        research = replaceOnce(
          research,
          expectedSection29And30ParaphraseBlock,
          `${expectedSection29And30ParaphraseBlock}

Note: paragraphs are alternatives.`,
          "append section 30 contradiction",
        );
        await writeFile(researchPath, research);
      },
      "must not append contradictory Section 29/30",
    );

    await runAgainst(
      "append-section-29-contradiction",
      async (root) => {
        const researchPath = path.join(root, "docs/REFERENCE.md");
        let research = await readFile(researchPath, "utf8");
        research = replaceOnce(
          research,
          expectedSection29And30ParaphraseBlock,
          `${expectedSection29And30ParaphraseBlock}

Alternatively, either unfair advantage or conduct contrary to honest practices suffices alone.`,
          "append section 29 contradiction",
        );
        await writeFile(researchPath, research);
      },
      "must not append contradictory Section 29/30",
    );

    await runAgainst(
      "contradictory-com-adr-022-reason",
      async (root) => {
        const decisionsPath = path.join(root, "docs/COMMERCE.md");
        let decisions = await readFile(decisionsPath, "utf8");
        decisions = replaceOnce(
          decisions,
          expectedComAdr022Reason,
          "Owner-selected fail-closed product policy after REQUIREMENTS and RESEARCH conflicted on bottle-label readiness. This grants trademark clearance and permission to use references on every surface.",
          "com-adr-022 reason",
        );
        await writeFile(decisionsPath, decisions);
      },
      "COM-ADR-022 reason must remain exact-locked",
    );

    await runAgainst(
      "append-com-adr-022-clearance",
      async (root) => {
        const decisionsPath = path.join(root, "docs/COMMERCE.md");
        let decisions = await readFile(decisionsPath, "utf8");
        decisions = replaceOnce(
          decisions,
          expectedComAdr022Reason,
          `${expectedComAdr022Reason} It also grants legal clearance for public titles and permits reference use on PDP copy.`,
          "append com-adr-022 clearance",
        );
        await writeFile(decisionsPath, decisions);
      },
      "COM-ADR-022 reason must remain exact-locked",
    );

    await runAgainst(
      "inspired-title-populated",
      async (root) => {
        const launchPath = path.join(root, launchProductPath);
        let launch = await readFile(launchPath, "utf8");
        launch = replaceOnce(
          launch,
          "main_list:1,main_list,1,Bvlgari Tygar,Inspired by Bvlgari Tygar,inspired-by-bvlgari-tygar,listing_title_recorded,",
          "main_list:1,main_list,1,Bvlgari Tygar,Inspired by Tygar,inspired-by-tygar,listing_title_recorded,",
          "inspired title",
        );
        await writeFile(launchPath, launch);
      },
      "listing title must match the approved Inspired by form",
    );

    await runAgainst(
      "unmapped-inspired-title",
      async (root) => {
        const launchPath = path.join(root, launchProductPath);
        let launch = await readFile(launchPath, "utf8");
        launch = replaceOnce(
          launch,
          "main_list:10,main_list,10,Heaven Rose,,,reference_title_pending_mapping,",
          "main_list:10,main_list,10,Heaven Rose,Inspired by Heaven Rose,inspired-by-heaven-rose,listing_title_recorded,",
          "unmapped inspired title",
        );
        await writeFile(launchPath, launch);
      },
      "public title must remain blank until an approved title reference exists",
    );

    await runAgainst(
      "evidence-gap-invented-url",
      async (root) => {
        const registerPath = path.join(root, "docs/REFERENCE.md");
        let register = await readFile(registerPath, "utf8");
        register = replaceOnce(
          register,
          "| main_list:37 | 212 VIP Men | Carolina Herrera | 212 VIP Men | owner_approved_title_reference | — | evidence_gap | none | 2026-07-30 | — | COM-ADR-018 |",
          "| main_list:37 | 212 VIP Men | Carolina Herrera | 212 VIP Men | owner_approved_title_reference | https://www.carolinaherrera.com/us/en/fake-vip | evidence_gap | none | 2026-07-30 | — | COM-ADR-018 |",
          "evidence gap url",
        );
        await writeFile(registerPath, register);
      },
      "evidence_gap must not invent an evidence URL",
    );

    await runAgainst(
      "publishable-product",
      async (root) => {
        const launchPath = path.join(root, launchProductPath);
        let launch = await readFile(launchPath, "utf8");
        launch = replaceOnce(
          launch,
          "main_list:1,main_list,1,Bvlgari Tygar,Inspired by Bvlgari Tygar,inspired-by-bvlgari-tygar,listing_title_recorded,inspired_collection,inspired_fragrance,not_flagged,Bvlgari,Tygar,owner_approved_title_reference,planned_public_pending_review,india_counsel_pending,,,,,,,,,,,,,,missing,selected,needs_owner_input,",
          "main_list:1,main_list,1,Bvlgari Tygar,Inspired by Bvlgari Tygar,inspired-by-bvlgari-tygar,listing_title_recorded,inspired_collection,inspired_fragrance,not_flagged,Bvlgari,Tygar,owner_approved_title_reference,planned_public_pending_review,india_counsel_pending,,,,,,,,,,,,,,missing,selected,approved,",
          "publishable product",
        );
        await writeFile(launchPath, launch);
      },
      "must remain non-publishable",
    );

    await runAgainst(
      "digest-constant-bypass",
      async (root) => {
        const registerPath = path.join(root, "docs/REFERENCE.md");
        const launchPath = path.join(root, launchProductPath);
        const decisionsPath = path.join(root, "docs/COMMERCE.md");
        let register = await readFile(registerPath, "utf8");
        register = replaceOnce(
          register,
          "| main_list:1 | Bvlgari Tygar | Bvlgari | Tygar | owner_approved_title_reference |",
          "| main_list:1 | Bvlgari Tygar | Acme | Altered Identity | owner_approved_title_reference |",
          "register identity bypass",
        );
        await writeFile(registerPath, register);
        let launch = await readFile(launchPath, "utf8");
        launch = replaceOnce(
          launch,
          "main_list:1,main_list,1,Bvlgari Tygar,Inspired by Bvlgari Tygar,inspired-by-bvlgari-tygar,listing_title_recorded,inspired_collection,inspired_fragrance,not_flagged,Bvlgari,Tygar,owner_approved_title_reference,",
          "main_list:1,main_list,1,Bvlgari Tygar,Inspired by Bvlgari Tygar,inspired-by-bvlgari-tygar,listing_title_recorded,inspired_collection,inspired_fragrance,not_flagged,Acme,Altered Identity,owner_approved_title_reference,",
          "launch identity bypass",
        );
        await writeFile(launchPath, launch);

        // Compute the mutated approved-identity digest the same way as the verifier.
        const normalizeMappingCell = (value) => (value === "—" ? "" : value);
        const referenceMappingRows = register
          .split("\n")
          .filter((line) => /^\|\s*main_list:\d+\s*\|/.test(line))
          .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
          .filter((cells) => cells.length === 11)
          .map(
            ([
              key,
              sourceName,
              brand,
              fragrance,
              status,
              ,
              ,
              ,
              ,
              ,
              decision,
            ]) => ({
              key,
              sourceName,
              brand: normalizeMappingCell(brand),
              fragrance: normalizeMappingCell(fragrance),
              status,
              decision,
            }),
          );
        const approvedIdentityCanonical = referenceMappingRows
          .filter(
            (mapping) =>
              mapping.status === "owner_approved_title_reference" ||
              mapping.status === "family_approved_exact_pending",
          )
          .map((mapping) =>
            [
              mapping.key,
              mapping.sourceName,
              mapping.brand,
              mapping.fragrance,
              mapping.status,
              mapping.decision,
            ].join("\x1f"),
          )
          .join("\n");
        const newDigest = createHash("sha256")
          .update(approvedIdentityCanonical)
          .digest("hex");

        let decisions = await readFile(decisionsPath, "utf8");
        decisions = replaceOnce(
          decisions,
          expectedApprovedMappingIdentityAuthorityLine,
          expectedApprovedMappingIdentityAuthorityLine.replace(
            expectedApprovedMappingIdentityDigest,
            newDigest,
          ),
          "authority line digest",
        );
        await writeFile(decisionsPath, decisions);

        let scriptSource = await readFile(scriptPath, "utf8");
        scriptSource = replaceOnce(
          scriptSource,
          `const expectedApprovedMappingIdentityDigest =\n  "${expectedApprovedMappingIdentityDigest}";`,
          `const expectedApprovedMappingIdentityDigest =\n  "${newDigest}";`,
          "script digest constant",
        );
        scriptSource = replaceOnce(
          scriptSource,
          expectedApprovedMappingIdentityAuthorityLine,
          expectedApprovedMappingIdentityAuthorityLine.replace(
            expectedApprovedMappingIdentityDigest,
            newDigest,
          ),
          "script authority line constant",
        );
        const patchedScriptPath = path.join(root, "patched-verify-commerce-foundation.mjs");
        await writeFile(patchedScriptPath, scriptSource);
        return patchedScriptPath;
      },
      "non-frozen approved mapping digest requires a new COM-ADR citing that digest",
    );

    console.log(
      `commerce-foundation-self-test: baseline passed; ${cases.length} negative mutations rejected with expected diagnostics`,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function verifyCommerceFoundation() {
  for (const documentPath of requiredCommerceDocuments) {
    await assert.doesNotReject(
      access(path.join(repositoryRoot, documentPath)),
      `${documentPath} must exist`,
    );
    await assertRelativeMarkdownLinks(documentPath);
  }
  await assertRelativeMarkdownLinks("README.md");

  const commerceDocument = await readFile(
    path.join(repositoryRoot, "docs/COMMERCE.md"),
    "utf8",
  );
  const referenceDocument = await readFile(
    path.join(repositoryRoot, "docs/REFERENCE.md"),
    "utf8",
  );
  assertSectionMarkers(commerceDocument, "docs/COMMERCE.md", "commerce", [
    "contract",
    "architecture",
    "requirements",
    "decisions",
    "verification",
    "release-checklist",
  ]);
  assertSectionMarkers(referenceDocument, "docs/REFERENCE.md", "reference", [
    "research",
    "mapping-register",
    "storefront-design",
    "evidence",
  ]);

  const requirements = await readFile(
    path.join(repositoryRoot, "docs/COMMERCE.md"),
    "utf8",
  );
  const requirementRows = requirements
    .split("\n")
    .filter((line) => /^\|\s*[A-Z][A-Z0-9]*-\d{3}\s*\|/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  const requirementIds = requirementRows.map(([id]) => id);
  assert.equal(
    requirementRows.length,
    expectedRequirementIds.size,
    "commerce requirements must contain the complete expected requirement set",
  );
  assert.equal(
    new Set(requirementIds).size,
    requirementIds.length,
    "commerce requirement IDs must be unique",
  );
  assert.deepEqual(
    new Set(requirementIds),
    expectedRequirementIds,
    "commerce requirement IDs changed; update verification deliberately",
  );
  for (const [id, status, requirement, acceptanceCriteria] of requirementRows) {
    assert.match(id, /^[A-Z][A-Z0-9]*-\d{3}$/, `invalid requirement ID: ${id}`);
    assert.ok(
      allowedRequirementStatuses.has(status),
      `${id} has unsupported requirement status: ${status}`,
    );
    assert.ok(requirement, `${id} must describe a requirement`);
    assert.ok(acceptanceCriteria, `${id} must define acceptance criteria`);
  }

  const decisions = await readFile(
    path.join(repositoryRoot, "docs/COMMERCE.md"),
    "utf8",
  );
  const decisionRows = decisions
    .split("\n")
    .filter((line) => /^\|\s*COM-ADR-\d{3}\s*\|/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  const decisionIds = decisionRows.map(([id]) => id);
  assert.deepEqual(
    decisionIds,
    Array.from({ length: 33 }, (_, index) =>
      `COM-ADR-${String(index + 1).padStart(3, "0")}`,
    ),
    "commerce decision IDs must be unique and sequential through COM-ADR-033",
  );
  for (const [id, date, status, decision, reason] of decisionRows) {
    assertCalendarDate(date, `${id} decision date`);
    assert.ok(
      allowedDecisionStatuses.has(status),
      `${id} has unsupported decision status: ${status}`,
    );
    assert.ok(decision, `${id} must describe a decision`);
    assert.ok(reason, `${id} must record reason and consequence`);
  }
  const decisionStatuses = new Map(
    decisionRows.map(([id, , status]) => [id, status]),
  );
  for (const [id, expectedStatus] of [
    ["COM-ADR-004", "Superseded"],
    ["COM-ADR-005", "Superseded"],
    ["COM-ADR-006", "Superseded"],
    ["COM-ADR-007", "Superseded"],
    ["COM-ADR-008", "Superseded"],
    ["COM-ADR-009", "Superseded"],
    ["COM-ADR-010", "Accepted"],
    ["COM-ADR-011", "Superseded"],
    ["COM-ADR-012", "Accepted"],
    ["COM-ADR-013", "Accepted"],
    ["COM-ADR-014", "Superseded"],
    ["COM-ADR-015", "Superseded"],
    ["COM-ADR-016", "Accepted"],
    ["COM-ADR-017", "Accepted"],
    ["COM-ADR-018", "Accepted"],
    ["COM-ADR-019", "Accepted"],
    ["COM-ADR-020", "Accepted"],
    ["COM-ADR-021", "Accepted"],
    ["COM-ADR-022", "Accepted"],
    ["COM-ADR-023", "Accepted"],
    ["COM-ADR-024", "Accepted"],
    ["COM-ADR-025", "Superseded"],
    ["COM-ADR-026", "Accepted"],
    ["COM-ADR-027", "Accepted"],
    ["COM-ADR-028", "Accepted"],
    ["COM-ADR-029", "Accepted"],
    ["COM-ADR-030", "Accepted"],
    ["COM-ADR-031", "Accepted"],
    ["COM-ADR-032", "Accepted"],
    ["COM-ADR-033", "Accepted"],
  ]) {
    assert.equal(
      decisionStatuses.get(id),
      expectedStatus,
      `${id} must retain deliberately reviewed status ${expectedStatus}`,
    );
  }
  const expectedOwnerDecisionStatements = new Map([
    [
      "COM-ADR-013",
      "Use all 21 supplied Signature Series source names as their owner-approved Perfume Aura public names.",
    ],
    [
      "COM-ADR-014",
      "Treat each selected fragrance's purchasable 10 ml variant as a tester and its 30/50/100 ml variants as bottles.",
    ],
    [
      "COM-ADR-015",
      "Use AI-generated batches as proposals for the 82 inspired public names, with explicit owner approval required for every name before recording it as approved.",
    ],
    [
      "COM-ADR-016",
      "Keep `Green Creed` unresolved; record `Cycus Flora` as the Gucci Flora family, `YSL-Y` as the Yves Saint Laurent Y family, and `CH 212 Men` as the Carolina Herrera 212 Men family for internal review.",
    ],
    [
      "COM-ADR-017",
      "Use exact in-house Signature Series names without an “Inspired by” prefix, and plan future inspired-product titles as “Inspired by <owner-confirmed reference>” instead of separate Perfume Aura names.",
    ],
    [
      "COM-ADR-018",
      "Record `VIP 212 Men` as Carolina Herrera — `212 VIP Men`, `1 Million` as Rabanne — `1 Million`, and `Baccarat` as Maison Francis Kurkdjian — `Baccarat Rouge 540` family; keep `F Fabulous` unresolved.",
    ],
    [
      "COM-ADR-019",
      "Confirm `Oud of Duraj`, `Royal Stablor`, and `Mbgamare` as exact in-house Signature Series names with no external inspiration or reference mapping.",
    ],
    [
      "COM-ADR-020",
      "Keep `Gucci Guilty EX` and `Pawake` as unresolved inspired references; do not reclassify Pawake as in-house and do not choose a Gucci Guilty flanker without evidence.",
    ],
    [
      "COM-ADR-021",
      "Approve the 46 clear brand/reference strings listed in [`REFERENCE.md`](REFERENCE.md) as `owner_approved_title_reference` mappings for inspired-title planning.",
    ],
    [
      "COM-ADR-022",
      "Keep designer and inspired-reference names disabled on bottle labels and packaging until separate explicit owner approval and India-counsel approval for that surface.",
    ],
    [
      "COM-ADR-029",
      "Use `Inspired by <brand> <reference>` as the storefront listing title for every `owner_approved_title_reference` inspired row; omit the word `family` from the customer title; if the cleaned reference already begins with the brand, do not repeat the brand; keep the 34 incomplete inspired rows unlistable; keep Signature names unchanged. This records listing identity only and is not India-counsel clearance, disclaimer approval, publication approval, or permission to use references on bottle labels or packaging.",
    ],
    [
      "COM-ADR-030",
      "Launch India/INR commerce with anonymous browsing and cart creation, required verified customer authentication at checkout, Google as the primary sign-in path with verified email/password fallback, Cashfree prepaid UPI intent/QR (including Google Pay where Cashfree and the customer's device support it), no COD, configurable flat shipping, and manual courier fulfillment.",
    ],
    [
      "COM-ADR-031",
      "Stage the 48 Inspired products as the first fixed-price cart-preview batch at 30 ml ₹600, 50 ml ₹800, and 100 ml ₹1,400. Keep all 21 Signature products visible but price-pending and non-purchasable until one exact owner-approved price is supplied for each 50 ml and 105 ml variant.",
    ],
    [
      "COM-ADR-032",
      "Replace the active catalog with the exact owner-supplied 2026-08-29 sources: 94 main products and 20 Signature products; price main rows 1–16 at ₹600/₹800/₹1,400 for 30/50/100 ml, main rows 17–94 at ₹450/₹650/₹1,200, and Signature rows at their supplied 50/105 ml prices. Carry forward only previously approved inspired mappings that still identify a replacement row, keep all other inspired titles blank, and keep every legal, import, publication, checkout, and release gate closed.",
    ],
    [
      "COM-ADR-033",
      "Research the 49 replacement main-list rows without storefront titles; map 34 rows with a defensible or owner-directed potential brand/reference to Inspired, place the remaining 15 generic, brand-only, conflicting, multi-brand, or non-exact names in a temporary `Unknown` collection using their supplied literal names, and expose all 114 products without changing any supplied price.",
    ],
  ]);
  for (const [id, , , decision] of decisionRows) {
    const expectedDecision = expectedOwnerDecisionStatements.get(id);
    if (expectedDecision) {
      assert.equal(
        decision,
        expectedDecision,
        `${id} owner decision text changed`,
      );
    }
  }
  assert.match(
    decisions,
    requiredComAdr023FieldSupersession,
    "COM-ADR-027 must explicitly preserve the still-valid fields of COM-ADR-023",
  );
  assert.match(
    decisions,
    requiredComAdr030Supersession,
    "COM-ADR-030 must explicitly replace COM-ADR-025 and preserve its still-selected fields",
  );

  const comAdr022 = decisionRows.find(([id]) => id === "COM-ADR-022");
  assert.ok(comAdr022, "COM-ADR-022 row must exist");
  assert.equal(
    comAdr022[3],
    expectedComAdr022Decision,
    "COM-ADR-022 decision text must remain exact-locked",
  );
  assert.equal(
    comAdr022[4],
    expectedComAdr022Reason,
    "COM-ADR-022 reason must remain exact-locked surface-control-only policy",
  );
  assert.equal(
    forbiddenLegalContradictionPattern.test(decisions),
    false,
    "decisions must not contain clearance/other-surface contradiction language",
  );

  const research = await readFile(
    path.join(repositoryRoot, "docs/REFERENCE.md"),
    "utf8",
  );
  for (const expectedArtifactDigest of sourceArtifacts.values()) {
    assert.ok(
      research.includes(expectedArtifactDigest),
      `research must retain supplied artifact SHA-256 ${expectedArtifactDigest}`,
    );
  }
  assert.ok(
    research.includes(
      "https://www.indiacode.nic.in/show-data?actid=AC_CEN_11_60_00004_199947_1517807323972&orderno=29&sectionId=16814&sectionno=29",
    ),
    "research must cite India Code Section 29 directly",
  );
  assert.ok(
    research.includes(
      "https://www.indiacode.nic.in/show-data?actid=AC_CEN_11_60_00004_199947_1517807323972&orderno=30&sectionId=16815&sectionno=30",
    ),
    "research must cite India Code Section 30 directly",
  );
  assert.ok(
    research.includes(expectedSection29And30ParaphraseBlock),
    "research must retain exact-locked Section 29/30 statutory paraphrase block",
  );
  assert.equal(
    forbiddenLegalContradictionPattern.test(research),
    false,
    "research must not append contradictory Section 29/30 or clearance language",
  );
  assert.ok(
    /not a statutory safe harbor/i.test(research),
    "research must state disclaimer is not a statutory safe harbor",
  );
  assert.ok(
    /disabled on bottle labels and packaging/i.test(research),
    "research must record bottle-label disablement policy",
  );
  assert.ok(
    /disabled on bottle labels and packaging/i.test(requirements),
    "TRUST-001 must keep bottle-label designer references disabled pending dual approval",
  );
  assert.ok(
    /every intended surface/i.test(requirements),
    "TRUST-001 must require counsel approval for every intended surface",
  );
  const releaseChecklist = await readFile(
    path.join(repositoryRoot, "docs/COMMERCE.md"),
    "utf8",
  );
  assert.ok(
    /India-counsel evidence recorded naming every intended surface reviewed/i.test(
      releaseChecklist,
    ),
    "release checklist must require surface-named India-counsel evidence",
  );
  assert.ok(
    decisions.includes("COM-ADR-022") &&
      /disabled on bottle labels and packaging/i.test(decisions),
    "COM-ADR-022 must record bottle-label disablement policy",
  );
  const retainedArtifactDigests = new Map();
  for (const [artifactPath, expectedDigest] of sourceArtifacts) {
    const retainedDigest = createHash("sha256")
      .update(await readFile(path.join(repositoryRoot, artifactPath)))
      .digest("hex");
    assert.equal(
      retainedDigest,
      expectedDigest,
      `${artifactPath} differs from the reviewed source`,
    );
    retainedArtifactDigests.set(artifactPath, retainedDigest);
  }

  const referenceMappingDocument = await readFile(
    path.join(repositoryRoot, "docs/REFERENCE.md"),
    "utf8",
  );
  const normalizeMappingCell = (value) => (value === "—" ? "" : value);
  const allowedEvidenceSourceTypes = new Set([
    "official_brand",
    "official_regional",
    "retailer",
    "archive",
    "evidence_gap",
  ]);
  const allowedContentSupport = new Set([
    "confirmed",
    "blocked",
    "weak",
    "mismatch",
    "none",
  ]);
  const referenceMappingRows = referenceMappingDocument
    .split("\n")
    .filter((line) => /^\|\s*main_list:\d+\s*\|/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length === 11)
    .map(
      ([
        key,
        sourceName,
        brand,
        fragrance,
        status,
        evidenceUrl,
        sourceType,
        contentSupport,
        auditDate,
        effectiveUrl,
        decision,
      ]) => ({
        key,
        sourceName,
        brand: normalizeMappingCell(brand),
        fragrance: normalizeMappingCell(fragrance),
        status,
        evidenceUrl: normalizeMappingCell(evidenceUrl),
        sourceType: normalizeMappingCell(sourceType),
        contentSupport: normalizeMappingCell(contentSupport),
        auditDate: normalizeMappingCell(auditDate),
        effectiveUrl: normalizeMappingCell(effectiveUrl),
        decision,
      }),
    );
  assert.equal(
    referenceMappingRows.length,
    94,
    "reference mapping register must contain every main-list source row",
  );
  assert.deepEqual(
    referenceMappingRows.map(({ key }) => key),
    Array.from({ length: 94 }, (_, index) => `main_list:${index + 1}`),
    "reference mapping register must preserve main-list source order",
  );
  const referenceMappingByKey = new Map(
    referenceMappingRows.map((mapping) => [mapping.key, mapping]),
  );
  for (const [status, expectedCount] of [
    ["owner_approved_title_reference", 79],
    ["not_applicable_unknown", 15],
  ]) {
    assert.equal(
      referenceMappingRows.filter((mapping) => mapping.status === status)
        .length,
      expectedCount,
      `reference mapping register must contain ${expectedCount} ${status} rows`,
    );
  }

  const approvedIdentityCanonical = referenceMappingRows
    .filter(
      (mapping) =>
        mapping.status === "owner_approved_title_reference" ||
        mapping.status === "family_approved_exact_pending",
    )
    .map((mapping) =>
      [
        mapping.key,
        mapping.sourceName,
        mapping.brand,
        mapping.fragrance,
        mapping.status,
        mapping.decision,
      ].join("\x1f"),
    )
    .join("\n");
  const approvedMappingIdentityDigest = createHash("sha256")
    .update(approvedIdentityCanonical)
    .digest("hex");
  assert.equal(
    approvedMappingIdentityDigest,
    expectedApprovedMappingIdentityDigest,
    "approved mapping identities changed; add COM-ADR citing replacement digest and update authority line deliberately",
  );
  if (
    expectedApprovedMappingIdentityDigest ===
    INITIAL_FROZEN_APPROVED_MAPPING_IDENTITY_DIGEST
  ) {
    assert.ok(
      decisions.includes(expectedApprovedMappingIdentityAuthorityLine),
      "decisions must retain approved mapping identity digest authority line",
    );
  } else {
    assert.ok(
      decisions.includes(expectedApprovedMappingIdentityAuthorityLine),
      "decisions must retain approved mapping identity digest authority line",
    );
    const hasReplacementAdr = decisionRows.some(([id, , , decision, reason]) => {
      const sequence = Number(String(id).replace("COM-ADR-", ""));
      return (
        Number.isFinite(sequence) &&
        sequence > 22 &&
        `${decision}\n${reason}`.includes(expectedApprovedMappingIdentityDigest)
      );
    });
    assert.ok(
      hasReplacementAdr,
      "non-frozen approved mapping digest requires a new COM-ADR citing that digest",
    );
  }

  const exceptionTableSection =
    referenceMappingDocument.split("### Documented evidence exceptions and gaps")[1] ??
    "";
  assert.ok(
    exceptionTableSection,
    "reference mappings must document evidence exceptions and gaps",
  );
  for (const key of retailerExceptionKeys) {
    assert.ok(
      exceptionTableSection.includes(`| ${key} |`),
      `${key} retailer exception must appear in exception table`,
    );
  }
  assert.ok(
    /strongest-available (?:retailer|identity)/i.test(exceptionTableSection),
    "exception table must label strongest-available retailer/identity evidence",
  );
  assert.ok(
    /retailer/i.test(exceptionTableSection),
    "exception table must identify retailer handling",
  );
  for (const key of evidenceGapKeys) {
    assert.ok(
      exceptionTableSection.includes(`| ${key} |`),
      `${key} evidence gap must appear in exception table`,
    );
  }

  const evidenceUrlOwners = new Map();
  const observedRetailerKeys = [];
  const observedEvidenceGapKeys = [];
  const claimUniqueUrl = (url, key, fieldName) => {
    if (!url) {
      return;
    }
    const previous = evidenceUrlOwners.get(url);
    assert.equal(
      previous === undefined || previous === key,
      true,
      `${key} ${fieldName} reuses URL already claimed by ${previous}`,
    );
    evidenceUrlOwners.set(url, key);
  };
  for (const mapping of referenceMappingRows) {
    const {
      key,
      status,
      evidenceUrl,
      sourceType,
      contentSupport,
      auditDate,
      effectiveUrl,
      brand,
      fragrance,
    } = mapping;
    const approved =
      status === "owner_approved_title_reference" ||
      status === "family_approved_exact_pending";
    if (status === "not_applicable_unknown") {
      assert.equal(brand, "", `${key} Unknown mapping brand must be blank`);
      assert.equal(
        fragrance,
        "",
        `${key} Unknown mapping reference must be blank`,
      );
      assert.equal(
        evidenceUrl,
        "",
        `${key} Unknown mapping evidence URL must be blank`,
      );
      assert.equal(
        sourceType,
        "",
        `${key} Unknown mapping source type must be blank`,
      );
      assert.equal(
        contentSupport,
        "",
        `${key} Unknown mapping content support must be blank`,
      );
      assertCalendarDate(auditDate, `${key} Unknown classification audit date`);
      assert.equal(
        effectiveUrl,
        "",
        `${key} Unknown mapping effective URL must be blank`,
      );
      assert.equal(
        mapping.decision,
        "COM-ADR-033",
        `${key} Unknown classification must cite COM-ADR-033`,
      );
      continue;
    }
    if (!approved) {
      assert.equal(
        evidenceUrl,
        "",
        `${key} pending mapping evidence URL must be blank`,
      );
      assert.equal(
        sourceType,
        "",
        `${key} pending mapping source type must be blank`,
      );
      assert.equal(
        contentSupport,
        "",
        `${key} pending mapping content support must be blank`,
      );
      assert.equal(
        auditDate,
        "",
        `${key} pending mapping audit date must be blank`,
      );
      assert.equal(
        effectiveUrl,
        "",
        `${key} pending mapping effective URL must be blank`,
      );
      continue;
    }

    assert.ok(
      allowedEvidenceSourceTypes.has(sourceType),
      `${key} has unsupported evidence source_type: ${sourceType}`,
    );
    assert.ok(
      allowedContentSupport.has(contentSupport),
      `${key} has unsupported content_support: ${contentSupport}`,
    );
    assertCalendarDate(auditDate, `${key} audit date`);

    if (sourceType === "evidence_gap") {
      observedEvidenceGapKeys.push(key);
      assert.equal(
        evidenceUrl,
        "",
        `${key} evidence_gap must not invent an evidence URL`,
      );
      assert.equal(
        effectiveUrl,
        "",
        `${key} evidence_gap must not invent an effective URL`,
      );
      assert.equal(
        contentSupport,
        "none",
        `${key} evidence_gap content_support must be none`,
      );
      assert.ok(
        evidenceGapKeys.has(key),
        `${key} is not an authorized evidence_gap key`,
      );
      continue;
    }

    assert.ok(evidenceUrl, `${key} approved mapping needs an evidence URL`);
    assertEvidenceUrlConstraints({
      value: evidenceUrl,
      key,
      fieldName: "evidence URL",
      brand,
      fragrance,
      sourceType,
    });
    if (effectiveUrl) {
      assertEvidenceUrlConstraints({
        value: effectiveUrl,
        key,
        fieldName: "effective URL",
        brand,
        fragrance,
        sourceType,
      });
    }

    if (sourceType === "official_brand" || sourceType === "official_regional") {
      assert.ok(
        contentSupport === "confirmed" ||
          contentSupport === "blocked" ||
          contentSupport === "weak",
        `${key} official evidence content_support must be confirmed, blocked, or weak`,
      );
    } else if (sourceType === "retailer") {
      observedRetailerKeys.push(key);
      assert.ok(
        retailerExceptionKeys.has(key),
        `${key} is not an authorized retailer exception key`,
      );
      assert.ok(
        contentSupport === "confirmed" || contentSupport === "weak",
        `${key} retailer evidence content_support must be confirmed or weak`,
      );
    } else if (sourceType === "archive") {
      assert.ok(
        contentSupport === "confirmed" ||
          contentSupport === "blocked" ||
          contentSupport === "weak",
        `${key} archive evidence content_support must be confirmed, blocked, or weak`,
      );
    }

    assert.equal(
      contentSupport === "mismatch",
      false,
      `${key} mismatched evidence must be removed or recorded as evidence_gap`,
    );
    claimUniqueUrl(evidenceUrl, key, "evidence URL");
    claimUniqueUrl(effectiveUrl, key, "effective URL");
  }

  assert.deepEqual(
    observedRetailerKeys.sort(),
    [...retailerExceptionKeys].sort(),
    "retailer exception keys must match the authorized set exactly",
  );
  assert.deepEqual(
    observedEvidenceGapKeys.sort(),
    [...evidenceGapKeys].sort(),
    "evidence_gap keys must match the authorized set exactly",
  );
  assert.equal(
    referenceMappingByKey.get("main_list:37")?.sourceType,
    "evidence_gap",
    "main_list:37 must remain an explicit evidence gap without inventing support",
  );
  assert.equal(
    referenceMappingByKey.get("main_list:35")?.sourceType,
    "retailer",
    "main_list:35 must remain labeled strongest-available retailer evidence",
  );

  const parsed = parseCsv(
    await readFile(path.join(repositoryRoot, catalogPath), "utf8"),
  );
  assert.ok(parsed.length > 1, "commerce catalog must include header and rows");
  assert.deepEqual(parsed[0], expectedHeader, "commerce catalog header changed");

  const rows = parsed.slice(1).map((values, index) => {
    assert.equal(
      values.length,
      expectedHeader.length,
      `catalog row ${index + 2} must contain ${expectedHeader.length} columns`,
    );
    return Object.fromEntries(
      expectedHeader.map((column, columnIndex) => [
        column,
        values[columnIndex],
      ]),
    );
  });
  assert.equal(rows.length, 114, "commerce catalog must contain 114 source rows");

  const mainRows = rows.filter((row) => row.source_section === "main_list");
  const signatureRows = rows.filter(
    (row) => row.source_section === "signature_series",
  );
  assert.equal(mainRows.length, 94, "main list must contain 94 rows");
  assert.equal(
    signatureRows.length,
    20,
    "Signature Series must contain 20 rows",
  );
  assertSequential(mainRows, 94, "main_list");
  assertSequential(signatureRows, 20, "signature_series");

  const sourceKeys = rows.map(
    (row) => `${row.source_section}:${row.source_number}`,
  );
  assert.equal(
    new Set(sourceKeys).size,
    sourceKeys.length,
    "catalog source keys must be unique",
  );

  for (const row of rows) {
    const key = `${row.source_section}:${row.source_number}`;
    assert.ok(row.source_name, `${key} must preserve a source name`);
    assert.equal(row.public_name, "", `${key} public name must remain unresolved`);
    assert.equal(
      row.launch_status,
      "needs_review",
      `${key} launch status must remain needs_review`,
    );
    assert.equal(row.image_status, "missing", `${key} image must remain missing`);

    if (row.source_section === "main_list") {
      const mapping = referenceMappingByKey.get(key);
      assert.ok(mapping, `${key} must exist in the main-list mapping register`);
      const expectedClassification =
        mapping.status === "not_applicable_unknown"
          ? "unknown_collection"
          : "inspired_collection";
      assert.equal(
        row.classification_status,
        expectedClassification,
        `${key} source classification must match the reviewed mapping register`,
      );
    } else {
      assert.equal(
        row.classification_status,
        "signature_series",
        `${key} must remain classified as Signature Series`,
      );
    }

    if (requiredReviewFlags.has(key)) {
      assert.ok(row.review_notes, `${key} must retain an ambiguity review note`);
    }
  }

  const canonicalSource = rows
    .map((row) =>
      [row.source_section, row.source_number, row.source_name].join("\x1f"),
    )
    .join("\n");
  const sourceDigest = createHash("sha256")
    .update(canonicalSource)
    .digest("hex");
  assert.equal(
    sourceDigest,
    expectedSourceDigest,
    "catalog source transcription changed; re-verify against supplied artifacts before updating digest",
  );

  const launchProductParsed = parseCsv(
    await readFile(path.join(repositoryRoot, launchProductPath), "utf8"),
  );
  assert.deepEqual(
    launchProductParsed[0],
    expectedLaunchProductHeader,
    "launch product header changed",
  );
  const launchProducts = launchProductParsed.slice(1).map((values, index) => {
    assert.equal(
      values.length,
      expectedLaunchProductHeader.length,
      `launch product row ${index + 2} must contain ${expectedLaunchProductHeader.length} columns`,
    );
    return Object.fromEntries(
      expectedLaunchProductHeader.map((column, columnIndex) => [
        column,
        values[columnIndex],
      ]),
    );
  });
  assert.equal(
    launchProducts.length,
    rows.length,
    "launch product workbook must contain every source row",
  );
  const unresolvedProductFields = [
    "audience",
    "fragrance_family",
    "top_notes",
    "heart_notes",
    "base_notes",
    "occasion",
    "season",
    "intensity",
    "concentration",
    "longevity_guidance",
    "sillage",
    "ingredients",
    "usage_instructions",
  ];
  const allowedMappingDecisions = new Map([
    [
      "owner_approved_title_reference",
      new Set(["COM-ADR-018", "COM-ADR-021", "COM-ADR-033"]),
    ],
    ["family_approved_exact_pending", new Set(["COM-ADR-016", "COM-ADR-018"])],
    ["unresolved", new Set(["COM-ADR-016", "COM-ADR-018", "COM-ADR-020"])],
    ["needs_owner_input", new Set(["Pending"])],
    ["not_applicable_unknown", new Set(["COM-ADR-033"])],
  ]);
  const approvedPublicNames = new Set();
  const approvedPublicNameSlugs = new Set();
  for (const [index, product] of launchProducts.entries()) {
    const source = rows[index];
    const key = `${source.source_section}:${source.source_number}`;
    assert.equal(product.source_key, key, `${key} launch source key changed`);
    assert.equal(
      product.source_section,
      source.source_section,
      `${key} section changed`,
    );
    assert.equal(
      product.source_number,
      source.source_number,
      `${key} number changed`,
    );
    assert.equal(
      product.source_name,
      source.source_name,
      `${key} source name changed`,
    );
    assert.equal(
      product.review_notes,
      source.review_notes,
      `${key} review note changed`,
    );
    assert.equal(product.launch_scope, "selected", `${key} must be selected`);
    assert.equal(
      product.approval_status,
      "needs_owner_input",
      `${key} must remain non-publishable while sale data is incomplete`,
    );
    assert.equal(
      product.image_status,
      "missing",
      `${key} image must remain missing`,
    );
    for (const field of unresolvedProductFields) {
      assert.equal(product[field], "", `${key} ${field} must remain unresolved`);
    }

    if (source.source_section === "main_list") {
      const mappingReview = referenceMappingByKey.get(key);
      assert.ok(mappingReview, `${key} must exist in reference mapping register`);
      if (product.reference_mapping_status === "owner_approved_title_reference") {
        const expectedTitle = inspiredListingTitle(
          product.reference_brand,
          product.reference_fragrance,
        );
        const expectedListingSlug = listingSlug(expectedTitle);
        assert.equal(
          product.public_name,
          expectedTitle,
          `${key} listing title must match the approved Inspired by form`,
        );
        assert.equal(
          product.public_name_slug,
          expectedListingSlug,
          `${key} listing slug must match the approved Inspired by title`,
        );
        assert.equal(
          product.name_approval_status,
          "listing_title_recorded",
          `${key} mapped listing title state changed`,
        );
      } else if (
        product.reference_mapping_status === "not_applicable_unknown"
      ) {
        assert.equal(
          product.public_name,
          source.source_name,
          `${key} Unknown listing must preserve the supplied literal name`,
        );
        assert.equal(
          product.public_name_slug,
          listingSlug(source.source_name),
          `${key} Unknown slug must match the supplied literal name`,
        );
        assert.equal(
          product.name_approval_status,
          "owner_directed_temporary_name",
          `${key} Unknown name state changed`,
        );
      } else {
        assert.equal(
          product.public_name,
          "",
          `${key} public title must remain blank until an approved title reference exists`,
        );
        assert.equal(
          product.public_name_slug,
          "",
          `${key} slug stays blank until an approved title reference exists`,
        );
        assert.equal(
          product.name_approval_status,
          "reference_title_pending_mapping",
          `${key} reference-title state changed without exact mapping approval`,
        );
      }
      assert.equal(
        product.collection,
        mappingReview.status === "not_applicable_unknown"
          ? "unknown_collection"
          : "inspired_collection",
        `${key} collection changed`,
      );
      assert.equal(
        product.identity_type,
        mappingReview.status === "not_applicable_unknown"
          ? "unclassified_fragrance"
          : "inspired_fragrance",
        `${key} identity changed`,
      );
      assert.equal(
        product.source_name_review_status,
        mappingReview.status === "not_applicable_unknown"
          ? "research_reconciled_unknown"
          : mappingReview.decision === "COM-ADR-033"
            ? "research_reconciled"
            : requiredReviewFlags.has(key)
              ? "ambiguity_unresolved"
              : "not_flagged",
        `${key} source-name review state changed`,
      );
      assert.equal(
        product.reference_display_status,
        mappingReview.status === "not_applicable_unknown"
          ? "not_applicable"
          : "planned_public_pending_review",
        `${key} public reference intent must remain pending legal review`,
      );
      assert.equal(
        product.legal_review_status,
        mappingReview.status === "not_applicable_unknown"
          ? "trademark_clearance_pending"
          : "india_counsel_pending",
        `${key} legal review must remain pending`,
      );

      assert.equal(
        mappingReview.sourceName,
        product.source_name,
        `${key} mapping register source transcription changed`,
      );
      assert.deepEqual(
        [product.reference_brand, product.reference_fragrance],
        [mappingReview.brand, mappingReview.fragrance],
        `${key} launch mapping differs from reviewed register`,
      );
      assert.equal(
        product.reference_mapping_status,
        mappingReview.status,
        `${key} launch mapping state differs from reviewed register`,
      );
      assert.ok(
        allowedMappingDecisions
          .get(mappingReview.status)
          ?.has(mappingReview.decision),
        `${key} mapping decision does not match ${mappingReview.status}`,
      );
      if (
        mappingReview.status === "owner_approved_title_reference" ||
        mappingReview.status === "family_approved_exact_pending"
      ) {
        assert.ok(mappingReview.brand, `${key} approved mapping needs a brand`);
        assert.ok(
          mappingReview.fragrance,
          `${key} approved mapping needs a reference`,
        );
        if (mappingReview.sourceType === "evidence_gap") {
          assert.equal(
            mappingReview.evidenceUrl,
            "",
            `${key} evidence_gap must not invent an evidence URL`,
          );
        } else {
          assert.ok(
            mappingReview.evidenceUrl,
            `${key} approved mapping needs an evidence URL`,
          );
        }
      } else {
        assert.equal(
          mappingReview.brand,
          "",
          `${key} pending mapping brand must be blank`,
        );
        assert.equal(
          mappingReview.fragrance,
          "",
          `${key} pending mapping reference must be blank`,
        );
        assert.equal(
          mappingReview.evidenceUrl,
          "",
          `${key} pending mapping evidence must be blank`,
        );
      }
    } else {
      assert.equal(
        product.collection,
        "signature_series",
        `${key} collection changed`,
      );
      assert.equal(
        product.identity_type,
        "signature_series",
        `${key} identity changed`,
      );
      assert.equal(
        product.public_name,
        source.source_name,
        `${key} owner-approved Signature public name changed`,
      );
      const expectedSlug = source.source_name
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      assert.equal(product.public_name_slug, expectedSlug, `${key} slug changed`);
      assert.equal(
        product.name_approval_status,
        "owner_approved",
        `${key} Signature name approval changed`,
      );
      assert.equal(
        product.source_name_review_status,
        "owner_confirmed_as_public_name",
        `${key} Signature source-name review changed`,
      );
      assert.equal(
        product.reference_brand,
        "",
        `${key} reference brand must stay empty`,
      );
      assert.equal(
        product.reference_fragrance,
        "",
        `${key} reference fragrance must stay empty`,
      );
      assert.equal(
        product.reference_mapping_status,
        "not_applicable",
        `${key} in-house Signature reference mapping must stay not applicable`,
      );
      assert.equal(
        product.reference_display_status,
        "not_applicable",
        `${key} reference display state changed`,
      );
      assert.equal(
        product.legal_review_status,
        "trademark_clearance_pending",
        `${key} Signature name clearance must remain pending`,
      );
    }

    if (product.public_name) {
      assert.ok(
        !approvedPublicNames.has(product.public_name.toLowerCase()),
        `${key} public name must be unique`,
      );
      assert.ok(
        !approvedPublicNameSlugs.has(product.public_name_slug),
        `${key} public-name slug must be unique`,
      );
      approvedPublicNames.add(product.public_name.toLowerCase());
      approvedPublicNameSlugs.add(product.public_name_slug);
    }
  }
  assert.equal(
    approvedPublicNames.size,
    114,
    "20 Signature, 79 Inspired, and 15 Unknown listing names must be unique",
  );

  const launchVariantParsed = parseCsv(
    await readFile(path.join(repositoryRoot, launchVariantPath), "utf8"),
  );
  assert.deepEqual(
    launchVariantParsed[0],
    expectedLaunchVariantHeader,
    "launch variant header changed",
  );
  const launchVariants = launchVariantParsed.slice(1).map((values, index) => {
    assert.equal(
      values.length,
      expectedLaunchVariantHeader.length,
      `launch variant row ${index + 2} must contain ${expectedLaunchVariantHeader.length} columns`,
    );
    return Object.fromEntries(
      expectedLaunchVariantHeader.map((column, columnIndex) => [
        column,
        values[columnIndex],
      ]),
    );
  });
  assert.equal(
    launchVariants.length,
    mainRows.length * 3 + signatureRows.length * 2,
    "launch variant workbook must contain the approved collection-specific sizes",
  );
  assert.deepEqual(
    launchVariants.map(({ source_key, size_ml }) => `${source_key}:${size_ml}`),
    rows.flatMap((row) =>
      (row.source_section === "signature_series" ? [50, 105] : [30, 50, 100]).map(
        (size) => `${row.source_section}:${row.source_number}:${size}`,
      ),
    ),
    "variant rows must be ordered by source product and approved size set",
  );
  const unresolvedVariantFields = [
    "sku",
    "barcode",
    "cost_minor",
    "opening_stock",
    "reorder_level",
    "review_notes",
  ];
  for (const variant of launchVariants) {
    const key = `${variant.source_key}:${variant.size_ml}`;
    assert.equal(variant.currency, "INR", `${key} currency must be INR`);
    assert.equal(variant.variant_type, "bottle", `${key} must be a bottle`);
    assert.equal(
      variant.availability_intent,
      "available",
      `${key} availability intent changed`,
    );
    assert.equal(
      variant.stock_status,
      "count_pending",
      `${key} stock must remain pending`,
    );
    assert.equal(variant.launch_scope, "selected", `${key} must be selected`);
    if (variant.source_key.startsWith("signature_series:")) {
      const signatureNumber = Number(variant.source_key.split(":")[1]);
      const premiumSignature = signatureNumber === 13 || signatureNumber === 20;
      const expectedRetailPriceMinor = new Map([
        ["50", premiumSignature ? "180000" : "120000"],
        ["105", premiumSignature ? "300000" : "220000"],
      ]).get(variant.size_ml);
      assert.equal(
        variant.retail_price_minor,
        expectedRetailPriceMinor,
        `${key} must retain the supplied Signature retail price in paise`,
      );
    } else {
      const mainNumber = Number(variant.source_key.split(":")[1]);
      const premiumMain = mainNumber <= 16;
      const expectedRetailPriceMinor = new Map([
        ["30", premiumMain ? "60000" : "45000"],
        ["50", premiumMain ? "80000" : "65000"],
        ["100", premiumMain ? "140000" : "120000"],
      ]).get(variant.size_ml);
      assert.equal(
        variant.retail_price_minor,
        expectedRetailPriceMinor,
        `${key} must retain the approved standard retail price in paise`,
      );
    }
    assert.equal(
      variant.approval_status,
      "needs_sku_cost_stock",
      `${key} must remain non-importable until SKU, cost, and stock are approved`,
    );
    for (const field of unresolvedVariantFields) {
      assert.equal(variant[field], "", `${key} ${field} must remain unresolved`);
    }
  }

  console.log(
    `commerce-foundation: ${requiredCommerceDocuments.length} docs, ${rows.length} source rows (${mainRows.length} main, ${signatureRows.length} signature), ${launchProducts.length} launch products, ${launchVariants.length} launch variants, ${requirementIds.length} requirements, ${decisionIds.length} decisions`,
  );
  console.log(`commerce-source-digest: ${sourceDigest}`);
  for (const [artifactPath, retainedDigest] of retainedArtifactDigests) {
    console.log(`commerce-source-artifact-digest: ${artifactPath} ${retainedDigest}`);
  }
  console.log(
    `commerce-approved-mapping-identity-digest: ${approvedMappingIdentityDigest}`,
  );
}

if (selfTestMode) {
  await runSelfTests();
} else {
  await verifyCommerceFoundation();
}
