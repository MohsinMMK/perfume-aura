import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import type { CaptureResult, Properties } from "posthog-js";

const sensitiveKeyPattern =
  /(authorization|cookie|email|name|password|phone|query|search|secret|token)/i;
const urlPropertyPattern = /(current_url|referrer|url)$/i;
const opaquePathSegmentPattern =
  /\/(?:[0-9a-f]{8}-[0-9a-f-]{27,}|[A-Za-z0-9_-]{24,})(?=\/|$)/gi;

export function parseObservabilitySampleRate(
  value: string | undefined,
  fallback = 0.1,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : fallback;
}

export function sanitizeObservabilityUrl(value: string): string {
  try {
    const url = new URL(value, "https://observability.invalid");
    const sanitizedPath = url.pathname.replace(
      opaquePathSegmentPattern,
      "/[redacted]",
    );
    return url.origin === "https://observability.invalid"
      ? sanitizedPath
      : `${url.origin}${sanitizedPath}`;
  } catch {
    return value.split(/[?#]/, 1)[0] ?? "[redacted-url]";
  }
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(
      /postgres(?:ql)?:\/\/[^\s]+/gi,
      "[redacted-database-url]",
    )
    .replace(
      /\b(authorization|cookie|password|secret|token)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[redacted]",
    );
}

function sanitizeProperties(properties: Properties): Properties {
  return Object.fromEntries(
    Object.entries(properties).flatMap(([key, value]) => {
      if (sensitiveKeyPattern.test(key)) return [];
      if (urlPropertyPattern.test(key) && typeof value === "string") {
        return [[key, sanitizeObservabilityUrl(value)]];
      }
      return [[key, value]];
    }),
  );
}

export function sanitizePostHogCapture(
  captureResult: CaptureResult | null,
): CaptureResult | null {
  if (!captureResult) return null;
  return {
    ...captureResult,
    properties: sanitizeProperties(captureResult.properties),
    ...(captureResult.$set
      ? { $set: sanitizeProperties(captureResult.$set) }
      : {}),
    ...(captureResult.$set_once
      ? { $set_once: sanitizeProperties(captureResult.$set_once) }
      : {}),
  };
}

export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  const sanitizedUserId = event.user?.id;
  return {
    ...event,
    message:
      typeof event.message === "string"
        ? redactSensitiveText(event.message)
        : event.message,
    exception: event.exception
      ? {
          ...event.exception,
          values: event.exception.values?.map((exceptionValue) => ({
            ...exceptionValue,
            value:
              typeof exceptionValue.value === "string"
                ? redactSensitiveText(exceptionValue.value)
                : exceptionValue.value,
          })),
        }
      : undefined,
    request: event.request
      ? {
          ...event.request,
          url:
            typeof event.request.url === "string"
              ? sanitizeObservabilityUrl(event.request.url)
              : event.request.url,
          cookies: undefined,
          data: undefined,
          headers: undefined,
          query_string: undefined,
        }
      : undefined,
    user:
      sanitizedUserId === undefined
        ? undefined
        : { id: String(sanitizedUserId) },
    extra: undefined,
  };
}

export function sanitizeSentryBreadcrumb(
  breadcrumb: Breadcrumb,
): Breadcrumb | null {
  if (
    breadcrumb.category === "console" ||
    breadcrumb.category === "ui.click" ||
    breadcrumb.category === "ui.input"
  ) {
    return null;
  }

  const sanitizedData = breadcrumb.data
    ? Object.fromEntries(
        Object.entries(breadcrumb.data).flatMap(([key, value]) => {
          if (sensitiveKeyPattern.test(key)) return [];
          if (urlPropertyPattern.test(key) && typeof value === "string") {
            return [[key, sanitizeObservabilityUrl(value)]];
          }
          return [[key, value]];
        }),
      )
    : undefined;

  return {
    ...breadcrumb,
    message:
      typeof breadcrumb.message === "string"
        ? redactSensitiveText(breadcrumb.message)
        : breadcrumb.message,
    data: sanitizedData,
  };
}
