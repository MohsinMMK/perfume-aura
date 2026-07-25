import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(currentDirectory, "../../..");

async function readRepositoryFile(path: string): Promise<string> {
  return readFile(resolve(repositoryRoot, path), "utf8");
}

describe("Phase 02 future-contract safety design", () => {
  it("keeps payment mutation enforcement deferred until reversals exist", async () => {
    const contract = await readRepositoryFile(
      "docs/ENGINEERING.md",
    );

    assert.match(contract, /CREATE TRIGGER "stock_movements_append_only"/);
    assert.doesNotMatch(contract, /CREATE TRIGGER "payments_append_only"/);
    assert.match(contract, /Intentional payment-trigger deferral/);
    assert.match(contract, /linked reversal\/credit-note/);
    assert.match(contract, /authoritative net-sum/);
  });

  it("requires void invoices and their authoritative payments to reconcile to zero", async () => {
    const [contract, preflight, reconciliation] = await Promise.all([
      readRepositoryFile("docs/ENGINEERING.md"),
      readRepositoryFile("packages/db/sql/phase02-preflight-0002.sql"),
      readRepositoryFile("packages/db/sql/phase02-reconciliation.sql"),
    ]);

    assert.match(
      contract,
      /"status" = 'void'[\s\S]*?"amount_paid_cents" = 0/,
    );
    for (const query of [preflight, reconciliation]) {
      assert.match(query, /"amount_paid_cents" <> 0/);
      assert.match(query, /void_invoice_authoritative_payment_nonzero/);
      assert.match(query, /"payment_totals"/);
    }
  });

  it("keeps free-text, status, and aggregate fulfillment boundaries explicit", async () => {
    const [contract, preflight, reconciliation] = await Promise.all([
      readRepositoryFile("docs/ENGINEERING.md"),
      readRepositoryFile("packages/db/sql/phase02-preflight-0002.sql"),
      readRepositoryFile("packages/db/sql/phase02-reconciliation.sql"),
    ]);

    assert.match(
      contract,
      /"variant_id" IS NOT NULL OR "quantity_fulfilled" = 0/,
    );
    assert.match(contract, /aggregate-only/);
    assert.match(contract, /Return movements are not netted/);
    assert.match(contract, /draft line with[\s\S]*matching sale movement/);

    for (const query of [preflight, reconciliation]) {
      assert.match(query, /draft_invoice_fulfillment_nonzero/);
      assert.match(query, /free_text_line_fulfillment_nonzero/);
      assert.match(query, /non_draft_invoice_without_lines/);
      assert.match(query, /invoice_subtotal_cache_mismatch/);
      assert.match(query, /invoice_fulfillment_quantity_mismatch/);
      assert.match(query, /void_invoice_fulfillment_nonzero/);
      assert.match(
        query,
        /"type" = 'sale'[\s\S]*?"ref_type" = 'invoice'/,
      );
    }
  });

  it("documents the exact runtime table matrix without broad sequence grants", async () => {
    const runbook = await readRepositoryFile(
      "docs/OPERATIONS.md",
    );

    assert.doesNotMatch(runbook, /ON ALL SEQUENCES/);
    assert.match(
      runbook,
      /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE[\s\S]*?"verification",[\s\S]*?"rate_limit"[\s\S]*?TO :"runtime_role"/,
    );
    assert.match(
      runbook,
      /"user", "session", "account", "verification", "rate_limit"/,
    );
    assert.match(
      runbook,
      /GRANT SELECT, INSERT, UPDATE ON TABLE[\s\S]*?"products"[\s\S]*?"document_number_counters"[\s\S]*?TO :"runtime_role"/,
    );
    assert.match(
      runbook,
      /GRANT SELECT ON TABLE[\s\S]*?"locations"[\s\S]*?TO :"runtime_role"/,
    );
    assert.match(
      runbook,
      /GRANT SELECT, INSERT ON TABLE[\s\S]*?"stock_movements"[\s\S]*?"payments"[\s\S]*?TO :"runtime_role"/,
    );
    assert.match(runbook, /FROM PUBLIC/);
    assert.match(runbook, /can_create_temp_objects/);
    assert.match(runbook, /has_table_privilege/);
    assert.match(runbook, /unexpected effective privilege/);
    assert.match(runbook, /has_sequence_privilege/);
    assert.match(runbook, /has_function_privilege/);
    assert.match(runbook, /pg_auth_members/);
  });
});
