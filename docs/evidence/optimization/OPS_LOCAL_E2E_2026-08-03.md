# Ops local optimization evidence — 2026-08-03

## Scope and result

This report records local authenticated and CI-equivalent evidence for the ops
optimization in `docs/OPTIMIZATION.md`. It does not authorize or record a
production deployment.

Result: **pass**. Authentication-route client JavaScript fell 44.3–45.6%,
authenticated dashboard behavior remained intact, reduced-motion transitions
became effectively immediate, dead-code analysis returned no unresolved issues,
full checks passed, and both standalone packages passed validation.

## Source identity

- Baseline Git SHA: `d3b95b73b60f74882f205c798d09828cfb127d5e`
- Lockfile SHA-256:
  `9c1a73d3e0e9c619c99958c6e2fb4c5f9efb18238cda79f71abe9a51b20161fd`
- Optimized implementation file-set SHA-256:
  `284ed2d7d919fd2a56f043e1622c5594fbe7ec2b8500194df4de3510385898ea`
- Node: `24.18.0`
- pnpm: `11.1.3`
- Next.js: `16.2.11`
- agent-browser: `0.27.0`
- Browser user agent: HeadlessChrome `150.0.0.0` on macOS

The implementation hash covers these sorted paths, hashing each path, a null
byte, its full content, and another null byte:

```text
apps/ops/app/globals.css
apps/ops/app/layout.tsx
apps/ops/components/app-shell.tsx
apps/ops/components/stock/adjust-stock-form.tsx
apps/ops/components/stock/receive-stock-form.tsx
apps/ops/lib/auth-client.ts
apps/ops/lib/auth-policy.ts
apps/ops/lib/auth.ts
apps/ops/lib/invoices.ts
apps/ops/lib/ops-access.ts
apps/ops/lib/payments.ts
apps/ops/lib/phase05-ui-contract.test.ts
apps/storefront/lib/cashfree.ts
knip.json
package.json
packages/db/src/inventory-math.ts
packages/validators/src/index.ts
scripts/measure-ops-browser.browser.js
scripts/measure-ops-route-client-js.mjs
```

## Reproduce route client-JavaScript measurements

Current optimized build:

```bash
pnpm build:ops
pnpm ops:measure-client > /tmp/ops-route-client-after.json
(cd apps/ops && pnpm next experimental-analyze --output)
```

`ops:measure-client` reads generated Next.js client-reference manifests, sums
unique referenced JavaScript chunks per route, and emits deterministic JSON.
It fails when build artifacts, manifests, or referenced chunks are absent.
`pnpm check` also runs `ops:verify-client-budget`, which guards the four auth
routes and dashboard against transitive client-graph regressions:

| Route | Budget |
|---|---:|
| `/login` | 185,000 B |
| `/forgot-password` | 181,000 B |
| `/reset-password` | 184,000 B |
| `/two-factor` | 176,000 B |
| `/dashboard` | 396,000 B |

Baseline comparison:

```bash
git worktree add /tmp/perfume-aura-ops-baseline \
  d3b95b73b60f74882f205c798d09828cfb127d5e
cd /tmp/perfume-aura-ops-baseline
pnpm install --frozen-lockfile
pnpm build:ops
node '<optimized-worktree>/scripts/measure-ops-route-client-js.mjs' \
  > /tmp/ops-route-client-before.json
```

Measured uncompressed route-referenced client JavaScript:

| Route | Before | After | Change |
|---|---:|---:|---:|
| `/login` | 313,965 B | 174,882 B | -44.3% |
| `/forgot-password` | 310,382 B | 171,299 B | -44.8% |
| `/reset-password` | 312,817 B | 173,734 B | -44.5% |
| `/two-factor` | 304,893 B | 165,810 B | -45.6% |
| `/dashboard` | 376,742 B | 376,657 B | effectively unchanged |

## Reproduce dead-code analysis

Knip `6.31.0` workspace and Next.js analysis:

```bash
DATABASE_URL_DIRECT='postgresql://unused:unused@127.0.0.1:1/unused' \
  pnpm dlx knip@6.31.0 --reporter json
```

The URL only allows Drizzle configuration loading; Knip does not connect to it.
Initial analysis found 13 unused exports/types and one wholly unreachable
Cashfree refund lookup. Final output was `{"issues":[]}` after deleting that
lookup, narrowing internally consumed exports, configuring two executable entry
files, and marking one intentional schema alias with Knip's symbol-local
`@alias` tag. No Knip issue category is suppressed; no package dependency or
reachable file was removed.

## Reproduce authenticated local fixture

Use only a disposable loopback database and synthetic credentials. Values below
are placeholders, not repository or production secrets.

```bash
createdb -h 127.0.0.1 perfume_aura_phase99_ops_e2e
DATABASE_URL='postgresql://<local-user>@127.0.0.1/perfume_aura_phase99_ops_e2e' \
  pnpm db:migrate
OWNER_EMAIL='<synthetic-owner@example.test>' \
OWNER_PASSWORD='<synthetic-password-of-at-least-12-characters>' \
DATABASE_URL='postgresql://<local-user>@127.0.0.1/perfume_aura_phase99_ops_e2e' \
BETTER_AUTH_SECRET='<synthetic-high-entropy-local-secret>' \
BETTER_AUTH_URL='http://localhost:3000' \
  pnpm --filter @perfume-aura/ops seed:owner
pnpm build:ops
NODE_ENV=test PORT=3000 \
DATABASE_URL='postgresql://<local-user>@127.0.0.1/perfume_aura_phase99_ops_e2e' \
BETTER_AUTH_SECRET='<same-synthetic-local-secret>' \
BETTER_AUTH_URL='http://localhost:3000' \
OPS_TWO_FACTOR_REQUIRED=false \
OPS_STAFF_INVITES_ENABLED=false \
  pnpm start:ops
```

`NODE_ENV=test` is local-only. It allows the security policy's fixed approved
`http://localhost:3000` origin while serving optimized build assets. The
standalone package intentionally enforces
`https://app.perfumeaura.com` at production runtime; authenticated HTTP-local
standalone startup is therefore rejected. Exact standalone contents were
validated separately through guarded package server smoke.

Cleanup:

```bash
dropdb -h 127.0.0.1 --force perfume_aura_phase99_ops_e2e
```

## Browser conditions and journeys

Desktop viewport: `1280 × 720`, device scale factor `1`.
Mobile viewport: `390 × 844`, device scale factor `1`.
Network: unthrottled loopback. Results are diagnostic lab evidence, not field
Core Web Vitals.

Reproduction uses one named agent-browser session. Replace credential
placeholders with disposable synthetic fixture values:

```bash
agent-browser --session ops-e2e set viewport 1280 720
agent-browser --session ops-e2e open http://localhost:3000/login
agent-browser --session ops-e2e find label Email fill '<synthetic-owner-email>'
agent-browser --session ops-e2e find label Password fill '<synthetic-password>'
agent-browser --session ops-e2e find role button click --name 'Sign in' --exact
agent-browser --session ops-e2e get url
agent-browser --session ops-e2e open http://localhost:3000/dashboard
agent-browser --session ops-e2e wait 500
agent-browser --session ops-e2e eval --stdin \
  < scripts/measure-ops-browser.browser.js
```

Reduced and normal motion comparison:

```bash
agent-browser --session ops-e2e set viewport 1280 720
agent-browser --session ops-e2e set media dark reduced-motion
agent-browser --session ops-e2e open http://localhost:3000/dashboard
agent-browser --session ops-e2e eval --stdin \
  < scripts/measure-ops-browser.browser.js
agent-browser --session ops-e2e set media dark
agent-browser --session ops-e2e open http://localhost:3000/dashboard
agent-browser --session ops-e2e eval --stdin \
  < scripts/measure-ops-browser.browser.js
```

Interaction assertions:

```bash
# Sidebar tooltip and keyboard focus/state
agent-browser --session ops-e2e set viewport 1280 720
agent-browser --session ops-e2e click '[data-slot="sidebar-trigger"]'
agent-browser --session ops-e2e find role link hover --name Products --exact
agent-browser --session ops-e2e focus '[data-slot="sidebar-trigger"]'
agent-browser --session ops-e2e press Enter
agent-browser --session ops-e2e eval --stdin \
  < scripts/measure-ops-browser.browser.js

# Mobile drawer exposure and close
agent-browser --session ops-e2e set viewport 390 844
agent-browser --session ops-e2e click '[data-slot="sidebar-trigger"]'
agent-browser --session ops-e2e snapshot -i
agent-browser --session ops-e2e press Escape

# Core route rendering
for route in products stock invoices finance customers; do
  agent-browser --session ops-e2e open "http://localhost:3000/$route"
  agent-browser --session ops-e2e snapshot -i
done

# Aggregate diagnostics after journeys
agent-browser --session ops-e2e network requests
agent-browser --session ops-e2e console
agent-browser --session ops-e2e errors
```

Toast reproduction uses the synthetic product form, then its lifecycle action:

```bash
agent-browser --session ops-e2e open http://localhost:3000/products/new
agent-browser --session ops-e2e find label 'Name *' fill 'Local Test Fragrance'
agent-browser --session ops-e2e find label 'SKU *' fill 'LOCAL-E2E-001'
agent-browser --session ops-e2e find label 'Size (ml) *' fill '50'
agent-browser --session ops-e2e find label 'Cost (INR) *' fill '1000'
agent-browser --session ops-e2e find label 'Retail (INR) *' fill '1500'
agent-browser --session ops-e2e find role button click \
  --name 'Create product' --exact
agent-browser --session ops-e2e find role button click --name Archive --exact
agent-browser --session ops-e2e find role button click \
  --name 'Archive product' --exact
agent-browser --session ops-e2e find text 'Product archived' text
```

Authenticated journeys completed:

1. Synthetic owner email/password sign-in.
2. Dashboard load and metric cards.
3. Dashboard navigation to products, stock, invoices, finance, and customers.
4. Product creation with one variant.
5. Product archive confirmation and accessible success toast.
6. Desktop sidebar collapse and Products tooltip.
7. Keyboard `Enter` sidebar toggle with focus retained on trigger.
8. Mobile drawer open, complete navigation exposure, and Escape close.
9. Reduced-motion and normal-motion computed-style comparison.

Warm local dashboard diagnostics:

- LCP: `136 ms`
- CLS: `0`
- long tasks: `0`
- JavaScript: `249,182` encoded bytes, `828,424` decoded bytes
- CSS before reduced-motion fix: `14,996` encoded / `83,828` decoded bytes
- CSS after reduced-motion fix: `15,053` encoded / `84,055` decoded bytes

Motion evidence:

- Before, reduced-motion mode retained `150–200 ms` transitions.
- After, maximum computed reduced-motion transition/animation was `0.01 ms`.
- Normal-motion sidebar transitions remained `150–200 ms`.
- Indeterminate spinner rotation becomes static under reduced motion by design;
  pending controls retain visible action text and focus-preserving disabled
  state.

No additional runtime optimization was applied because authenticated traces
showed no long task, layout-instability, or interaction bottleneck.

## Browser artifact attestations

Generated screenshots were intentionally kept outside Git to avoid adding binary
weight. Checksums make the reviewed local artifacts identifiable:

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `ops-e2e-dashboard-desktop.png` | 78,267 | `20dcec83c4bcea4d87471ba62bc6666e567edbf58dc8aad0b572b9dedb6a7874` |
| `ops-e2e-product-toast.png` | 80,978 | `a5f5697a396448afe581fd5fd31aabae2e52cb35a6994be18bce0aa2cae2e120` |
| `ops-e2e-customers-qa.png` | 49,435 | `ed0c2c8f77ecc33a766a27219b6b067b869c0ab7feb36bd34d575a74ea80e3bf` |
| `ops-e2e-sidebar-collapse.png` | 54,972 | `9cbd21f07829f270070e98e764efcbf77c7c471e1e09ccc988cb8b86f32224dd` |

## Final gates

```bash
pnpm check
TEST_DATABASE_URL='<migrated-disposable-loopback-url>' pnpm test:integration
TEST_DATABASE_URL='<migrated-disposable-loopback-url>' pnpm ops:pack
pnpm storefront:pack
DATABASE_URL_DIRECT='postgresql://unused:unused@127.0.0.1:1/unused' \
  pnpm dlx knip@6.31.0 --reporter json
git diff --check
```

All passed. Final standalone ZIP:

- size: `26,815,421` bytes
- SHA-256: `770a2553368733f9f7b00f9ae1077d84d42138dc635706249c8d82839c34871a`
- server smoke: `/login`, ready, session, version, and static asset returned
  `200`
- embedded source commit:
  `d3b95b73b60f74882f205c798d09828cfb127d5e`

Final storefront ZIP validation also passed: `31,869,041` bytes, SHA-256
`e5c86e09ceae55a17d1d79bd5b33c3dbd5ffb1f33a1c073f7eb531ea461acbba`.

This report captures pre-push local evidence; CI status is reported separately
after the requested push. No local server or disposable database remains
running.
