import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { isOwnerRole } from "./auth-policy";

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

type SessionWithRole = {
  user: {
    role?: unknown;
  };
};

export type OwnerAuthorizationDecision<T extends SessionWithRole> =
  | { kind: "allow"; session: T }
  | { kind: "redirect"; location: "/login" | "/login?error=access-denied" }
  | { kind: "deny" };

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
  const session = await getSession();
  const decision = decideOwnerAuthorization(session);
  return decision.kind === "allow" ? decision.session : null;
});

/**
 * Require a fully validated owner session. The redirect option is for page
 * loaders only; Server Actions throw a generic authorization error.
 */
export async function requireOwnerSession(options?: {
  redirectToLogin?: boolean;
}) {
  const decision = decideOwnerAuthorization(await getSession(), options);
  if (decision.kind === "allow") {
    return decision.session;
  }
  if (decision.kind === "redirect") {
    redirect(decision.location);
  }

  throw new OwnerAuthorizationError();
}
