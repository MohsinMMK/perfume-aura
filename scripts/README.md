# Scripts

| Script | pnpm command | Purpose |
|---|---|---|
| `pack-storefront-standalone.sh` | `storefront:pack` | Build, extract-smoke, checksum, and manifest the apex storefront ZIP |
| `pack-ops-standalone.sh` | `ops:pack` | Build, extract-smoke, checksum, and manifest the ops runtime |
| `publish-hostinger-ops-branch.sh` | `ops:publish-branch`, `storefront:publish-branch` | Publish a verified tree to its generated Hostinger branch |
| `verify-production-deploy.mjs` | `ops:verify-production-deploy` | Verify an exact ops/storefront SHA and storefront release locks |
| `verify-commerce-foundation.mjs` | `commerce:verify` | Check commerce catalog and contract invariants |

Both packers require exact Node `24.6.0`, npm `11.5.1`, and pnpm `10.32.1`,
matching the observed Hostinger-managed deployment baseline. The repository
engines accept compatible Node `24.x` patches from `24.6.0` onward.
They reject secret-shaped files, verify Linux x64 Sharp inputs, start extracted
servers, and atomically publish ZIP sidecars only after smoke passes.

Both packages are published as prebuilt standalone trees to generated Hostinger
branches; Hostinger never builds the source monorepo. The storefront ZIP remains
the emergency fallback. Environment values stay in Hostinger and storefront
release flags remain closed.
