import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

async function sourceFile(name: string): Promise<string> {
  return readFile(resolve(currentDirectory, name), "utf8");
}

function exportedFunction(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.indexOf("\nexport async function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

describe("Phase 03 Server Action boundaries", () => {
  it("authenticates each mutation before validation or business database access", async () => {
    const files = {
      products: await sourceFile("products.ts"),
      invoices: await sourceFile("invoices.ts"),
      payments: await sourceFile("payments.ts"),
    };
    const actions: Array<{
      source: string;
      name: string;
      firstBusinessCall: string;
    }> = [
      {
        source: files.products,
        name: "createProductAction",
        firstBusinessCall: "createProductSchema.safeParse",
      },
      {
        source: files.products,
        name: "createVariantAction",
        firstBusinessCall: "createVariantSchema.safeParse",
      },
      {
        source: files.products,
        name: "archiveProductAction",
        firstBusinessCall: "archiveProductSchema.safeParse",
      },
      {
        source: files.invoices,
        name: "createInvoiceDraftAction",
        firstBusinessCall: "createInvoiceDraftSchema.safeParse",
      },
      {
        source: files.invoices,
        name: "addInvoiceLineAction",
        firstBusinessCall: "invoiceLineSchema.safeParse",
      },
      {
        source: files.invoices,
        name: "removeInvoiceLineAction",
        firstBusinessCall: "removeInvoiceLineSchema.safeParse",
      },
      {
        source: files.invoices,
        name: "issueInvoiceAction",
        firstBusinessCall: "invoiceIdSchema.safeParse",
      },
      {
        source: files.invoices,
        name: "voidInvoiceAction",
        firstBusinessCall: "invoiceIdSchema.safeParse",
      },
      {
        source: files.invoices,
        name: "markInvoicePaidAction",
        firstBusinessCall: "markInvoicePaidSchema.safeParse",
      },
      {
        source: files.invoices,
        name: "fulfillInvoiceAction",
        firstBusinessCall: "fulfillInvoiceSchema.safeParse",
      },
      {
        source: files.payments,
        name: "recordPaymentAction",
        firstBusinessCall: "recordPaymentSchema.safeParse",
      },
    ];

    for (const action of actions) {
      const body = exportedFunction(action.source, action.name);
      const auth = body.indexOf("await requireOwnerSession()");
      const business = body.indexOf(action.firstBusinessCall);
      assert.ok(auth >= 0, `${action.name} must authenticate`);
      assert.ok(
        auth < business,
        `${action.name} must authenticate before processing input`,
      );
    }
  });

  it("revalidates only after the awaited domain transaction returns", async () => {
    const files = {
      products: await sourceFile("products.ts"),
      invoices: await sourceFile("invoices.ts"),
      payments: await sourceFile("payments.ts"),
    };
    const checks: Array<{
      source: string;
      name: string;
      transactionCall: string;
    }> = [
      {
        source: files.products,
        name: "createProductAction",
        transactionCall: "await createProductWithInitialVariant(",
      },
      {
        source: files.products,
        name: "createVariantAction",
        transactionCall: "await createProductVariant(",
      },
      {
        source: files.products,
        name: "archiveProductAction",
        transactionCall: "await archiveProduct(",
      },
      {
        source: files.invoices,
        name: "createInvoiceDraftAction",
        transactionCall: "await createInvoiceDraft(",
      },
      {
        source: files.invoices,
        name: "addInvoiceLineAction",
        transactionCall: "await addInvoiceLine(",
      },
      {
        source: files.invoices,
        name: "removeInvoiceLineAction",
        transactionCall: "await removeInvoiceLine(",
      },
      {
        source: files.invoices,
        name: "issueInvoiceAction",
        transactionCall: "await issueInvoice(",
      },
      {
        source: files.invoices,
        name: "voidInvoiceAction",
        transactionCall: "await voidInvoice(",
      },
      {
        source: files.invoices,
        name: "markInvoicePaidAction",
        transactionCall: "await recordRemainingInvoiceBalance(",
      },
      {
        source: files.invoices,
        name: "fulfillInvoiceAction",
        transactionCall: "await fulfillInvoice(",
      },
      {
        source: files.payments,
        name: "recordPaymentAction",
        transactionCall: "await recordPayment(",
      },
    ];

    for (const check of checks) {
      const body = exportedFunction(check.source, check.name);
      const transaction = body.indexOf(check.transactionCall);
      const revalidation = body.indexOf("revalidate");
      assert.ok(transaction >= 0, `${check.name} must await its domain call`);
      assert.ok(
        revalidation > transaction,
        `${check.name} may revalidate only after commit`,
      );
    }
  });
});
