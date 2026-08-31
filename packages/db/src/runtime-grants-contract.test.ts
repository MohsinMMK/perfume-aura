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
    assert.match(storefront, /'inquiry_notification_outbox', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(storefront, /'notification_outbox', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(storefront, /'shipping_serviceability', ARRAY\['SELECT'\]/);
    assert.match(ops, /'inquiry_notification_outbox', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(ops, /'notification_outbox', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(ops, /'shipping_serviceability', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(ops, /'oil_lots', ARRAY\['SELECT','INSERT','UPDATE'\]/);
    assert.match(ops, /'oil_movements', ARRAY\['SELECT','INSERT'\]/);
    assert.match(ops, /'ops_sales', ARRAY\['SELECT','INSERT'\]/);
    assert.match(
      storefront,
      /GRANT SELECT \("id", "product_id", "remaining_quantity_ml", "version", "created_at"\)[\s\S]*?ON TABLE "oil_lots"/,
    );
    assert.match(
      storefront,
      /GRANT UPDATE \("remaining_quantity_ml", "version", "updated_at"\)[\s\S]*?ON TABLE "oil_lots"/,
    );
    assert.match(storefront, /\('oil_lots', ARRAY\[\]::text\[\]\)/);
    assert.match(storefront, /\('total_cost_cents', ARRAY\[\]::text\[\]\)/);
    assert.match(storefront, /\('supplier_name', ARRAY\[\]::text\[\]\)/);
    assert.match(storefront, /'oil_movements', ARRAY\['SELECT','INSERT'\]/);
  });
});
