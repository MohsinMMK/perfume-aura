import * as Sentry from "@sentry/nextjs";

export function reportOpsHandledError(
  error: unknown,
  area: "database.query",
): void {
  const errorType = error instanceof Error ? error.name : "UnknownError";
  Sentry.captureException(error, {
    tags: { application: "operations", area, handled: "true" },
  });
  Sentry.logger.error("operations.handled_error", { area, error_type: errorType });
}
