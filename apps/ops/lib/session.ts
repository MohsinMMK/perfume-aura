import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { isOwnerRole } from "./auth-policy";
import {
  hasOpsCapability,
  isProtectedOpsRole,
  type OpsCapability,
} from "./ops-access";
import { isOpsTwoFactorRequired } from "./ops-security-policy";

/**
 * Full session validation for Server Components and Server Actions.
 * Proxy cookie checks are optimistic only — always use this
 * (or auth.api.getSession) before mutations and protected data.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export class OwnerAuthorizationError extends Error {
  constructor() {
    super("Owner authorization required");
    this.name = "OwnerAuthorizationError";
  }
}

export class OpsAuthorizationError extends Error {
  constructor() {
    super("Operations authorization required");
    this.name = "OpsAuthorizationError";
  }
}

export class OpsTwoFactorRequiredError extends Error {
  constructor() {
    super("Two-factor enrollment is required");
    this.name = "OpsTwoFactorRequiredError";
  }
}

type SessionWithRole = {
  user: {
    role?: unknown;
    twoFactorEnabled?: unknown;
  };
};

type OpsSessionOptions = {
  redirectToLogin?: boolean;
  allowPendingTwoFactor?: boolean;
};

export type OwnerAuthorizationDecision<T extends SessionWithRole> =
  | { kind: "allow"; session: T }
  | { kind: "redirect"; location: "/login" | "/login?error=access-denied" }
  | { kind: "deny" };

export type OpsAuthorizationDecision<T extends SessionWithRole> =
  | { kind: "allow"; session: T }
  | {
      kind: "redirect";
      location:
        | "/login"
        | "/login?error=access-denied"
        | "/settings/security?enroll=required";
    }
  | { kind: "deny" }
  | { kind: "two-factor-required" };

function hasRequiredTwoFactor<T extends SessionWithRole>(session: T): boolean {
  return (
    !isOpsTwoFactorRequired() ||
    !isProtectedOpsRole(session.user.role) ||
    session.user.twoFactorEnabled === true
  );
}

/**
 * Strict authenticated-operations policy. Unknown, missing, public-user, and
 * comma-separated roles are all denied before any data query or mutation.
 */
export function decideOpsAuthorization<T extends SessionWithRole>(
  session: T | null | undefined,
  options?: OpsSessionOptions,
): OpsAuthorizationDecision<T> {
  if (!session || !isProtectedOpsRole(session.user.role)) {
    if (options?.redirectToLogin) {
      return {
        kind: "redirect",
        location: session ? "/login?error=access-denied" : "/login",
      };
    }
    return { kind: "deny" };
  }

  if (!options?.allowPendingTwoFactor && !hasRequiredTwoFactor(session)) {
    if (options?.redirectToLogin) {
      return {
        kind: "redirect",
        location: "/settings/security?enroll=required",
      };
    }
    return { kind: "two-factor-required" };
  }

  return { kind: "allow", session };
}

/**
 * Pure policy shared by the real session helpers and integration tests. A
 * cookie without a live Better Auth session reaches this function as null.
 */
export function decideOwnerAuthorization<T extends SessionWithRole>(
  session: T | null | undefined,
  options?: { redirectToLogin?: boolean },
): OwnerAuthorizationDecision<T> {
  if (session && isOwnerRole(session.user.role)) {
    return { kind: "allow", session };
  }
  if (options?.redirectToLogin) {
    return {
      kind: "redirect",
      location: session ? "/login?error=access-denied" : "/login",
    };
  }
  return { kind: "deny" };
}

export const getOwnerSession = cache(async () => {
  const session = await getOpsSession();
  return session && isOwnerRole(session.user.role) ? session : null;
});

export const getOpsSession = cache(async () => {
  const decision = decideOpsAuthorization(await getSession());
  return decision.kind === "allow" ? decision.session : null;
});

/**
 * Require an authenticated owner or staff session. This is intentionally
 * separate from capability checks so security enrollment can admit a pending
 * protected account while all operational surfaces remain blocked.
 */
export async function requireOpsSession(options?: OpsSessionOptions) {
  const decision = decideOpsAuthorization(await getSession(), options);
  if (decision.kind === "allow") {
    return decision.session;
  }
  if (decision.kind === "redirect") {
    redirect(decision.location);
  }
  if (decision.kind === "two-factor-required") {
    throw new OpsTwoFactorRequiredError();
  }

  throw new OpsAuthorizationError();
}

/**
 * Enforce the typed operations matrix at every data and mutation boundary.
 */
export async function requireCapability(
  capability: OpsCapability,
  options?: OpsSessionOptions,
) {
  const session = await requireOpsSession({
    ...options,
    allowPendingTwoFactor:
      options?.allowPendingTwoFactor || capability === "security.self",
  });

  if (hasOpsCapability(session.user.role, capability)) {
    return session;
  }

  if (options?.redirectToLogin) {
    redirect("/login?error=access-denied");
  }

  throw new OpsAuthorizationError();
}

/**
 * Require a fully validated owner session. The redirect option is for page
 * loaders only; Server Actions throw a generic authorization error.
 */
export async function requireOwnerSession(options?: {
  redirectToLogin?: boolean;
}) {
  try {
    return await requireCapability("system.owner", options);
  } catch (error) {
    if (error instanceof OpsAuthorizationError) {
      throw new OwnerAuthorizationError();
    }
    throw error;
  }
}
