import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import {
  parseObservabilitySampleRate,
  sanitizeSentryBreadcrumb,
  sanitizeSentryEvent,
} from "@/lib/observability";

export function createStorefrontSentryOptions({
  dsn,
  sampleRate,
}: {
  dsn: string | undefined;
  sampleRate: string | undefined;
}) {
  const normalizedDsn = dsn?.trim();
  return {
    dsn: normalizedDsn || undefined,
    enabled: Boolean(normalizedDsn),
    enableLogs: true,
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: parseObservabilitySampleRate(sampleRate),
    beforeSend: (event: ErrorEvent) => sanitizeSentryEvent(event),
    beforeBreadcrumb: (breadcrumb: Breadcrumb) =>
      sanitizeSentryBreadcrumb(breadcrumb),
  };
}
