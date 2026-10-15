export type SecurityHeaderOptions = {
  reportOnly: boolean;
  development: boolean;
  /** Lets Khanect's portfolio show this page in its preview frame. */
  portfolioPreview?: boolean;
};

// Only the home page may be framed, so account and checkout routes stay out of any third-party frame.
export const PORTFOLIO_PREVIEW_PATH = "/";

export function contentSecurityPolicy(
  development: boolean,
  portfolioPreview = false,
): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""} https://sdk.cashfree.com https://accounts.google.com/gsi/client`,
    "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    `connect-src 'self' https://api.cashfree.com https://accounts.google.com/gsi/ https://*.posthog.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io${development ? " ws: wss:" : ""}`,
    "frame-src https://sdk.cashfree.com https://api.cashfree.com https://sandbox.cashfree.com https://payments.cashfree.com https://payments-test.cashfree.com https://accounts.google.com/gsi/",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    portfolioPreview
      ? "frame-ancestors 'self' https://khanect.com https://www.khanect.com"
      : "frame-ancestors 'none'",
    "manifest-src 'self'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join("; ");
}

// Next.js applies every matching rule and the later one wins per header, so the preview rule comes last.
export function securityHeaderRules(
  options: Omit<SecurityHeaderOptions, "portfolioPreview">,
): Array<{ source: string; headers: ReturnType<typeof securityHeaders> }> {
  return [
    { source: "/(.*)", headers: securityHeaders(options) },
    {
      source: PORTFOLIO_PREVIEW_PATH,
      headers: securityHeaders({ ...options, portfolioPreview: true }),
    },
  ];
}

export function securityHeaders({
  reportOnly,
  development,
  portfolioPreview = false,
}: SecurityHeaderOptions): Array<{
  key: string;
  value: string;
}> {
  return [
    {
      key: reportOnly
        ? "Content-Security-Policy-Report-Only"
        : "Content-Security-Policy",
      value: contentSecurityPolicy(development, portfolioPreview),
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
      // Browsers that honour frame-ancestors ignore this; it only guards the rest.
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
    {
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin-allow-popups",
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
