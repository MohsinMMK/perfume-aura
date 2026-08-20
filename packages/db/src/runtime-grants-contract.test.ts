import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("customer commerce runtime grant matrices", () => {
  it("includes profile, webhook lease, and notification outbox privileges", async () => {
    const [storefront, ops] = await Promise.all([
      readFile(new URL("../sql/storefront-runtime-grants.sql", import.meta.url), "utf8"),
      readFile(new URL("../sql/ops-runtime-grants.sql", import.meta.url), "utf8"),
    ]);
    assert.match(storefront, /storefront_customer_profile/);
    assert.match(storefront, /'payment_events', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(storefront, /'notification_outbox', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(ops, /'notification_outbox', ARRAY\['SELECT','INSERT','UPDATE'\]/);
  });
});
