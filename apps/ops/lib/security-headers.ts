export type SecurityHeaderOptions = {
  reportOnly: boolean;
  development: boolean;
};

export function contentSecurityPolicy(
  development: boolean,
): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    `connect-src 'self' https://*.posthog.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io${development ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join("; ");
}

/**
 * The same policy can be emitted report-only during local validation. The
 * committed Next config deliberately uses the enforced form.
 */
export function securityHeaders({
  reportOnly,
  development,
}: SecurityHeaderOptions): Array<{
  key: string;
  value: string;
}> {
  return [
    {
      key: reportOnly
        ? "Content-Security-Policy-Report-Only"
        : "Content-Security-Policy",
      value: contentSecurityPolicy(development),
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
    {
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin",
    },
    {
      key: "Cross-Origin-Resource-Policy",
      value: "same-origin",
    },
    ...(development
      ? []
      : [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ]),
  ];
}
