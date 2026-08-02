# Scripts

| Script | pnpm command | Purpose |
|---|---|---|
| `pack-storefront-standalone.sh` | `storefront:pack` | Build, extract-smoke, checksum, and manifest the apex storefront ZIP |
| `pack-ops-standalone.sh` | `ops:pack` | Build, extract-smoke, checksum, and manifest the ops runtime |
| `publish-hostinger-ops-branch.sh` | `ops:publish-branch` | Publish the verified ops tree to `hostinger-ops-production` |
| `verify-production-deploy.mjs` | `ops:verify-production-deploy` | Verify the ops exact SHA and the apex storefront release locks |
| `verify-commerce-foundation.mjs` | `commerce:verify` | Check commerce catalog and contract invariants |

Both packers require exact Node `24.18.0`, npm `11.16.0`, and pnpm `11.1.3`.
They reject secret-shaped files, verify Linux x64 Sharp inputs, start extracted
servers, and atomically publish ZIP sidecars only after smoke passes.

The ops package is automatically published to the generated Hostinger branch.
The storefront package is uploaded through Hostinger's Node.js Web App UI for
`perfumeaura.com`; its environment values stay in Hostinger and its release
flags remain closed.
