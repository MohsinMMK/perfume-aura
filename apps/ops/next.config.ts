import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { resolveBuildSourceCommit } from "./lib/build-version";
import { securityHeaders } from "./lib/security-headers";

// Monorepo root for standalone file tracing (relative to this config file).
// Next loads next.config with a dirname context.
const monorepoRoot = path.join(__dirname, "../..");

// Embed only a validated full source SHA at build time for /api/health/version.
const buildSourceCommit = resolveBuildSourceCommit();
const sentryOrg = process.env.SENTRY_ORG?.trim();
const sentryProject = process.env.OPS_SENTRY_PROJECT?.trim();
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const uploadSentrySourceMaps = Boolean(
  sentryOrg && sentryProject && sentryAuthToken,
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Hostinger Node deploy: ship prebuilt standalone (avoids esbuild EACCES on shared hosting)
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  env: {
    PERFUME_AURA_BUILD_COMMIT: buildSourceCommit,
  },
  transpilePackages: [
    "@perfume-aura/ui",
    "@perfume-aura/db",
    "@perfume-aura/validators",
  ],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.app.perfumeaura.com",
          },
        ],
        destination: "https://app.perfumeaura.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders({
          reportOnly: false,
          development: process.env.NODE_ENV === "development",
        }),
      },
    ];
  },
  // Do not use output: "export" — ops needs Server Actions + auth + DB
};

export default withSentryConfig(nextConfig, {
  org: sentryOrg,
  project: sentryProject,
  authToken: sentryAuthToken,
  telemetry: false,
  silent: !uploadSentrySourceMaps,
  sourcemaps: {
    disable: !uploadSentrySourceMaps,
    deleteSourcemapsAfterUpload: true,
  },
  release: {
    name: buildSourceCommit || undefined,
    create: uploadSentrySourceMaps,
  },
  webpack: {
    automaticVercelMonitors: false,
    treeshake: {
      removeDebugLogging: true,
      excludeReplayIframe: true,
      excludeReplayShadowDOM: true,
      excludeReplayCompressionWorker: true,
    },
  },
});
