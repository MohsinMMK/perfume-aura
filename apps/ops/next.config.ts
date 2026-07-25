import path from "node:path";
import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security-headers";

// Monorepo root for standalone file tracing (relative to this config file).
// Next loads next.config with a dirname context.
const monorepoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Hostinger Node deploy: ship prebuilt standalone (avoids esbuild EACCES on shared hosting)
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: [
    "@perfume-aura/ui",
    "@perfume-aura/db",
    "@perfume-aura/validators",
  ],
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

export default nextConfig;
