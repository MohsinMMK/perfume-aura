import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

describe("requireDisposableTestDatabaseUrl", () => {
  it("accepts an explicitly named loopback Phase 02 database", () => {
    const url =
      "postgresql://phase02_test:local-only@127.0.0.1:55432/perfume_aura_phase02_fresh";
    assert.equal(requireDisposableTestDatabaseUrl(url), url);
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
          "postgresql://user:redacted@ep-example-pooler.us-east-2.aws.neon.tech/perfume_aura_phase02_test",
        ),
      /loopback PostgreSQL/,
    );
  });

  it("rejects a local URL with an ambiguous database name", () => {
    assert.throws(
      () =>
        requireDisposableTestDatabaseUrl(
          "postgresql://phase02_test:local-only@localhost:55432/postgres",
        ),
      /database name must start/,
    );
  });

  it("rejects connection query parameters that could override the target", () => {
    assert.throws(
      () =>
        requireDisposableTestDatabaseUrl(
          "postgresql://phase02_test:local-only@localhost:55432/perfume_aura_phase02_test?host=remote.example",
        ),
      /query parameters are not allowed/,
    );
  });

  it("rejects a production-like database name even on loopback", () => {
    assert.throws(
      () =>
        requireDisposableTestDatabaseUrl(
          "postgresql://phase02_test:local-only@localhost:55432/perfume_aura_phase02_prod",
        ),
      /production-like target/,
    );
  });
});
