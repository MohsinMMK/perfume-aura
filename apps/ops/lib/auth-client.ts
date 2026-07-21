import { createAuthClient } from "better-auth/react";

/**
 * Browser / client-side Better Auth client.
 * baseURL is inferred from the current origin when omitted.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});

export const { signIn, signOut, useSession } = authClient;
