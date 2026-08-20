import {
  DEFAULT_USER_ROLE,
  OWNER_ROLE,
  STAFF_ROLE,
} from "./auth-policy";

const OPS_ROLES = [
  OWNER_ROLE,
  STAFF_ROLE,
  DEFAULT_USER_ROLE,
] as const;

export type OpsRole = (typeof OPS_ROLES)[number];

/**
 * Small, explicit capability matrix. UI visibility is convenience only; every
 * read and Server Action must authorize with one of these capabilities.
 */
export const OPS_CAPABILITIES = [
  "system.owner",
  "dashboard.view",
  "catalog.view",
  "catalog.edit-content",
  "catalog.manage-commercials",
  "stock.view",
  "stock.receive",
  "stock.adjust",
  "stock.view-cost",
  "customers.view",
  "customers.create",
  "customers.update",
  "customers.archive",
  "invoices.view",
  "invoices.draft",
  "invoices.issue",
  "invoices.print",
  "invoices.fulfill",
  "invoices.void",
  "payments.record",
  "finance.view",
  "commerce.view",
  "commerce.shipments.update",
  "commerce.support.manage",
  "commerce.reviews.moderate",
  "commerce.refunds.manage",
  "commerce.promotions.manage",
  "commerce.release-gates.manage",
  "security.self",
  "security.staff.manage",
  "security.audit.view",
] as const;

export type OpsCapability = (typeof OPS_CAPABILITIES)[number];

const STAFF_CAPABILITIES = [
  "dashboard.view",
  "catalog.view",
  "catalog.edit-content",
  "stock.view",
  "stock.receive",
  "customers.view",
  "customers.create",
  "customers.update",
  "invoices.view",
  "invoices.draft",
  "invoices.issue",
  "invoices.print",
  "invoices.fulfill",
  "commerce.view",
  "commerce.shipments.update",
  "commerce.support.manage",
  "commerce.reviews.moderate",
  "security.self",
] as const satisfies readonly OpsCapability[];

const ALL_CAPABILITIES = [...OPS_CAPABILITIES] as const;

const CAPABILITIES_BY_ROLE: Readonly<Record<OpsRole, readonly OpsCapability[]>> = {
  [OWNER_ROLE]: ALL_CAPABILITIES,
  [STAFF_ROLE]: STAFF_CAPABILITIES,
  [DEFAULT_USER_ROLE]: [],
};

/**
 * Roles are deliberately single, exact values. Better Auth's admin plugin can
 * represent comma-separated roles, but Ops must never interpret those values.
 */
export function parseOpsRole(value: unknown): OpsRole | null {
  if (typeof value !== "string") {
    return null;
  }

  return OPS_ROLES.includes(value as OpsRole) ? (value as OpsRole) : null;
}

export function isProtectedOpsRole(value: unknown): value is "owner" | "staff" {
  const role = parseOpsRole(value);
  return role === OWNER_ROLE || role === STAFF_ROLE;
}

export function hasOpsCapability(
  role: unknown,
  capability: OpsCapability,
): boolean {
  const parsedRole = parseOpsRole(role);
  return parsedRole !== null && CAPABILITIES_BY_ROLE[parsedRole].includes(capability);
}

export function capabilitiesForOpsRole(role: unknown): readonly OpsCapability[] {
  const parsedRole = parseOpsRole(role);
  return parsedRole === null ? [] : CAPABILITIES_BY_ROLE[parsedRole];
}
