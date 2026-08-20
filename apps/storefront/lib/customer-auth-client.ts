import { createAuthClient } from "better-auth/react";
import { oneTapClient } from "better-auth/client/plugins";

export const customerAuthClient = createAuthClient({
  basePath: "/api/customer-auth",
});

export function createCustomerGoogleAuthClient(clientId: string) {
  const normalizedClientId = clientId.trim();
  if (!normalizedClientId) {
    throw new Error("A Google client ID is required for Google sign-in");
  }

  return createAuthClient({
    basePath: "/api/customer-auth",
    plugins: [
      oneTapClient({
        clientId: normalizedClientId,
        autoSelect: false,
        cancelOnTapOutside: true,
        context: "signin",
        promptOptions: {
          fedCM: true,
          maxAttempts: 1,
        },
      }),
    ],
  });
}
