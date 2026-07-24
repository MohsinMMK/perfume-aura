type AuthClientError = {
  code?: string;
  message?: string;
  status?: number;
  statusText?: string;
};

const UNAVAILABLE_CODES = new Set([
  "INTERNAL_SERVER_ERROR",
  "SERVICE_UNAVAILABLE",
  "TIMEOUT",
  "UNKNOWN",
]);

const UNAVAILABLE_MESSAGE =
  "Sign-in service is temporarily unavailable. Try again.";

/**
 * Keep credential failures generic while distinguishing an unavailable auth
 * service from a bad password. This prevents database/server outages from
 * being presented to the owner as a credential problem.
 */
export function signInErrorMessage(
  error: AuthClientError | null | undefined,
): string {
  if (
    (typeof error?.status === "number" && error.status >= 500) ||
    (error?.code && UNAVAILABLE_CODES.has(error.code.toUpperCase())) ||
    /(?:fetch failed|network|service unavailable|timeout|timed out)/i.test(
      `${error?.statusText ?? ""} ${error?.message ?? ""}`,
    )
  ) {
    return UNAVAILABLE_MESSAGE;
  }

  return "Invalid email or password";
}

export function signInNetworkErrorMessage(): string {
  return UNAVAILABLE_MESSAGE;
}
