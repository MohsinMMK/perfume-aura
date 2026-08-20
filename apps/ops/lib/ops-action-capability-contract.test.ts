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

describe("direct operations action capability boundaries", () => {
  it("authorizes sensitive server actions before accepting caller data", async () => {
    const [commerce, products, staff, stock] = await Promise.all([
      sourceFile("commerce.ts"),
      sourceFile("products.ts"),
      sourceFile("staff-operations.ts"),
      sourceFile("stock.ts"),
    ]);
    const actions = [
      {
        source: commerce,
        name: "updateShipmentAction",
        capability: "commerce.shipments.update",
        input: "shipmentUpdateSchema.safeParse",
      },
      {
        source: commerce,
        name: "requestRefundAction",
        capability: "commerce.refunds.manage",
        input: "refundRequestSchema.safeParse",
      },
      {
        source: products,
        name: "updateVariantAction",
        capability: "catalog.manage-commercials",
        input: "updateVariantSchema.safeParse",
      },
      {
        source: stock,
        name: "adjustStockAction",
        capability: "stock.adjust",
        input: "adjustStockSchema.safeParse",
      },
      {
        source: staff,
        name: "inviteStaffAction",
        capability: "security.staff.manage",
        input: "staffInviteSchema.safeParse",
      },
      {
        source: staff,
        name: "deactivateStaffAction",
        capability: "security.staff.manage",
        input: "staffUserIdSchema.safeParse",
      },
    ];

    for (const action of actions) {
      const body = exportedFunction(action.source, action.name);
      const authorization = body.indexOf(
        `await requireCapability("${action.capability}")`,
      );
      const validation = body.indexOf(action.input);
      assert.ok(authorization >= 0, `${action.name} must require ${action.capability}`);
      assert.ok(validation >= 0, `${action.name} must validate its payload`);
      assert.ok(
        authorization < validation,
        `${action.name} must authorize before parsing caller-controlled input`,
      );
    }
  });

  it("requires paid state without letting shipment updates mutate payment", async () => {
    const commerce = await sourceFile("commerce.ts");
    const shipment = exportedFunction(commerce, "updateShipmentAction");

    assert.match(shipment, /paymentState: commerceOrders\.paymentState/);
    assert.match(shipment, /order\.paymentState !== "paid"/);
    assert.doesNotMatch(shipment, /\.set\(\{[^}]*paymentState/s);
    assert.doesNotMatch(shipment, /paymentAttempts/);
  });

  it("keeps an ambiguous refund reserved until provider reconciliation", async () => {
    const commerce = await sourceFile("commerce.ts");
    const refund = exportedFunction(commerce, "requestRefundAction");

    assert.match(refund, /providerStatus: "REQUEST_UNKNOWN"/);
    assert.match(refund, /status: "processing"/);
    assert.match(refund, /Do not submit another refund/);
  });

  it("never enables invitations without mandatory two-factor enrollment", async () => {
    const staff = await sourceFile("staff-operations.ts");
    const invite = exportedFunction(staff, "inviteStaffAction");
    const invitationsGate = invite.indexOf("areOpsStaffInvitesEnabled()");
    const twoFactorGate = invite.indexOf("isOpsTwoFactorRequired()");
    const validation = invite.indexOf("staffInviteSchema.safeParse");

    assert.ok(invitationsGate >= 0);
    assert.ok(twoFactorGate > invitationsGate);
    assert.ok(validation > twoFactorGate);
  });
});
