import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Full session validation for Server Components and Server Actions.
 * Proxy cookie checks are optimistic only — always use this
 * (or auth.api.getSession) before mutations and protected data.
 */
export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

/** Throws if there is no session. Use in server loaders/actions. */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
