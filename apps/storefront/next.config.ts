import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { securityHeaders } from "./lib/security-headers";

const monorepoRoot = path.join(__dirname, "../..");
const sentryOrg = process.env.SENTRY_ORG?.trim();
const sentryProject = process.env.STOREFRONT_SENTRY_PROJECT?.trim();
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const sourceCommit = (
  process.env.STANDALONE_SOURCE_COMMIT ?? process.env.GITHUB_SHA
)?.trim();
const releaseName = sourceCommit && /^[a-f0-9]{40}$/i.test(sourceCommit)
  ? sourceCommit.toLowerCase()
  : undefined;
const uploadSentrySourceMaps = Boolean(
  sentryOrg && sentryProject && sentryAuthToken,
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  env: releaseName
    ? {
        PERFUME_AURA_BUILD_COMMIT: releaseName,
      }
    : {},
  transpilePackages: [
    "@perfume-aura/ui",
    "@perfume-aura/db",
  ],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.perfumeaura.com",
          },
        ],
        destination: "https://perfumeaura.com/:path*",
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
          development: process.env.NODE_ENV !== "production",
        }),
      },
    ];
  },
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
    name: releaseName,
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
