import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createInvoiceWhatsAppUrl,
  normalizeWhatsAppRecipient,
} from "./invoice-sharing";

describe("invoice WhatsApp sharing", () => {
  it("normalizes Indian local numbers without guessing shorter values", () => {
    assert.equal(normalizeWhatsAppRecipient("98765 43210"), "919876543210");
    assert.equal(normalizeWhatsAppRecipient("+91 98765 43210"), "919876543210");
    assert.equal(normalizeWhatsAppRecipient("09876543210"), "919876543210");
    assert.equal(normalizeWhatsAppRecipient("123"), null);
  });

  it("creates a customer-addressed invoice summary", () => {
    const url = new URL(createInvoiceWhatsAppUrl({
      invoiceNumber: "INV-2026-0001",
      customerName: "Aisha",
      customerPhone: "+91 98765 43210",
      total: "₹1,200",
      balance: "₹0",
      items: ["Regent Noir · 50ml × 1"],
    })!);
    assert.equal(url.hostname, "wa.me");
    assert.equal(url.pathname, "/919876543210");
    assert.match(url.searchParams.get("text") ?? "", /INV-2026-0001/u);
    assert.match(url.searchParams.get("text") ?? "", /Regent Noir/u);
  });
});
