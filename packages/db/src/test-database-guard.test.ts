import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  disposableTestDatabaseNamePattern,
  phase02TestDatabasePrefix,
  requireDisposableTestDatabaseUrl,
} from "./test-database-guard";

describe("requireDisposableTestDatabaseUrl", () => {
  it("accepts explicitly scoped Phase 02, Phase 03, and Phase 04 loopback databases", () => {
    const urls = [
      "postgresql://phase02_test:local-only@127.0.0.1:55432/perfume_aura_phase02_fresh",
      "postgresql://phase03_test:local-only@127.0.0.1:55434/perfume_aura_phase03_root_admin",
      "postgres://phase04_test:local-only@localhost:55435/perfume_aura_phase04_workflow_test",
      "postgresql://phase04_test:local-only@[::1]:55435/perfume_aura_phase04_admin",
    ];

    for (const url of urls) {
      assert.equal(requireDisposableTestDatabaseUrl(url), url);
    }
  });

  it("retains the Phase 02 compatibility export", () => {
    assert.equal(phase02TestDatabasePrefix, "perfume_aura_phase02_");
    assert.equal(
      disposableTestDatabaseNamePattern.test(
        "perfume_aura_phase02_reconciliation_matrix",
      ),
      true,
    );
  });

  it("rejects a missing URL", () => {
    assert.throws(
      () => requireDisposableTestDatabaseUrl(""),
      /TEST_DATABASE_URL is required/,
    );
  });

  it("rejects a remote provider URL", () => {
    assert.throws(
      () =>
        requireDisposableTestDatabaseUrl(
          "postgresql://user:redacted@ep-example-pooler.us-east-2.aws.neon.tech/perfume_aura_phase03_root_admin",
        ),
      /loopback PostgreSQL/,
    );
  });

  it("rejects local URLs with ambiguous or malformed database names", () => {
    const urls = [
      "postgresql://phase03_test:local-only@localhost:55432/postgres",
      "postgresql://phase03_test:local-only@localhost:55432/perfume_aura_test",
      "postgresql://phase03_test:local-only@localhost:55432/perfume_aura_phase3_root_admin",
      "postgresql://phase03_test:local-only@localhost:55432/perfume_aura_phase03",
      "postgresql://phase03_test:local-only@localhost:55432/perfume_aura_phase03_root-admin",
    ];

    for (const url of urls) {
      assert.throws(
        () => requireDisposableTestDatabaseUrl(url),
        /database name must match/,
      );
    }
  });

  it("rejects connection query parameters that could override the target", () => {
    assert.throws(
      () =>
        requireDisposableTestDatabaseUrl(
          "postgresql://phase03_test:local-only@localhost:55432/perfume_aura_phase03_root_admin?host=remote.example",
        ),
      /query parameters are not allowed/,
    );
  });

  it("rejects production-like phase databases even on loopback", () => {
    const urls = [
      "postgresql://phase03_test:local-only@localhost:55432/perfume_aura_phase03_prod",
      "postgresql://phase03_test:local-only@localhost:55432/perfume_aura_phase03_root_production",
      "postgresql://phase04_test:local-only@localhost:55432/perfume_aura_phase04_prod_snapshot",
    ];

    for (const url of urls) {
      assert.throws(
        () => requireDisposableTestDatabaseUrl(url),
        /production-like target/,
      );
    }
  });

  it("guards the standalone server smoke before the URL reaches the server", () => {
    const packer = readFileSync(
      new URL("../../../scripts/pack-ops-standalone.sh", import.meta.url),
      "utf8",
    );
    const guardCall = packer.indexOf("requireDisposableTestDatabaseUrl()");
    const serverDatabaseAssignment = packer.indexOf(
      'DATABASE_URL="$TEST_DATABASE_URL"',
      guardCall,
    );

    assert.notEqual(guardCall, -1, "packer must invoke the repository guard");
    assert.notEqual(
      serverDatabaseAssignment,
      -1,
      "packer must pass the validated URL to the extracted server",
    );
    assert.ok(
      guardCall < serverDatabaseAssignment,
      "packer must validate TEST_DATABASE_URL before starting the server",
    );
  });
});
