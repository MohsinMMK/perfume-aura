import * as Sentry from "@sentry/nextjs";

export function reportStorefrontHandledError(
  error: unknown,
  area: "customer.account_action",
): void {
  const errorType = error instanceof Error ? error.name : "UnknownError";
  Sentry.captureException(error, {
    tags: { application: "storefront", area, handled: "true" },
  });
  Sentry.logger.error("storefront.handled_error", { area, error_type: errorType });
}
