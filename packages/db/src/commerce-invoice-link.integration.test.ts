import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

const testDatabaseUrl = requireDisposableTestDatabaseUrl();
process.env.DATABASE_URL = testDatabaseUrl;

describe("commerce order invoice linking", () => {
  let api: typeof import("./index");
  let orderId: string;
  let invoiceId: string;
  let checkoutSessionId: string;
  let cartId: string;
  let customerId: string;

  before(async () => {
    api = await import("./index");
    const suffix = randomUUID();

    const [customer] = await api.db
      .insert(api.customers)
      .values({ name: `Commerce invoice ${suffix}` })
      .returning({ id: api.customers.id });
    assert.ok(customer);
    customerId = customer.id;

    const [invoice] = await api.db
      .insert(api.invoices)
      .values({
        customerId,
        number: `INV-2099-${String(Date.now() % 1_000_000_000).padStart(4, "0")}`,
        status: "issued",
        currency: "INR",
        subtotalCents: 80_000,
        totalCents: 80_000,
        amountPaidCents: 0,
        issueDate: "2099-01-01",
        issuedAt: new Date(),
      })
      .returning({ id: api.invoices.id });
    assert.ok(invoice);
    invoiceId = invoice.id;

    const [cart] = await api.db
      .insert(api.commerceCarts)
      .values({
        tokenDigest: `invoice-link-cart-${suffix}`,
        expiresAt: new Date(Date.now() + 60_000),
      })
      .returning({ id: api.commerceCarts.id });
    assert.ok(cart);
    cartId = cart.id;

    const [checkout] = await api.db
      .insert(api.checkoutSessions)
      .values({
        cartId,
        tokenDigest: `invoice-link-checkout-${suffix}`,
        requestId: randomUUID(),
        payloadDigest: `invoice-link-payload-${suffix}`,
        email: "invoice-link@example.test",
        expiresAt: new Date(Date.now() + 60_000),
      })
      .returning({ id: api.checkoutSessions.id });
    assert.ok(checkout);
    checkoutSessionId = checkout.id;

    const [order] = await api.db
      .insert(api.commerceOrders)
      .values({
        orderNumber: `PA-TEST-${suffix}`,
        accessTokenDigest: `invoice-link-access-${suffix}`,
        checkoutSessionId,
        guestEmail: "invoice-link@example.test",
        status: "confirmed",
        paymentState: "paid",
        subtotalAmountMinor: 80_000,
        totalAmountMinor: 80_000,
        shippingAddressSnapshot: { country: "IN" },
      })
      .returning({ id: api.commerceOrders.id });
    assert.ok(order);
    orderId = order.id;
  });

  after(async () => {
    if (api) {
      await api.db.delete(api.commerceOrders).where(api.eq(api.commerceOrders.id, orderId));
      await api.db.delete(api.checkoutSessions).where(api.eq(api.checkoutSessions.id, checkoutSessionId));
      await api.db.delete(api.commerceCarts).where(api.eq(api.commerceCarts.id, cartId));
      await api.db.delete(api.invoices).where(api.eq(api.invoices.id, invoiceId));
      await api.db.delete(api.customers).where(api.eq(api.customers.id, customerId));
      await api.pool.end();
    }
  });

  it("links once at the approved paid transition and makes retries idempotent", async () => {
    const first = await api.linkCommerceOrderInvoice({
      orderId,
      invoiceId,
      transition: "prepaid_paid",
    });
    assert.equal(first.idempotent, false);

    const retry = await api.linkCommerceOrderInvoice({
      orderId,
      invoiceId,
      transition: "prepaid_paid",
    });
    assert.equal(retry.idempotent, true);

    await assert.rejects(
      () =>
        api.linkCommerceOrderInvoice({
          orderId,
          invoiceId,
          transition: "cod_reconciled",
        }),
      (error: unknown) =>
        error instanceof api.DomainError && error.code === "IDEMPOTENCY_CONFLICT",
    );
  });
});
