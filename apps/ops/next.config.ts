import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hostinger Node deploy: ship prebuilt standalone (avoids esbuild EACCES on shared hosting)
  output: "standalone",
  transpilePackages: [
    "@perfume-aura/ui",
    "@perfume-aura/db",
    "@perfume-aura/validators",
  ],
  // Do not use output: "export" — ops needs Server Actions + auth + DB
  experimental: {
    // SEC-6: production host for Server Actions (local always allowed by Next)
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "app.perfumeaura.com",
        "www.app.perfumeaura.com",
      ],
    },
  },
};

export default nextConfig;
