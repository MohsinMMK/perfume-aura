# Storefront local optimization evidence — 2026-08-03

## Scope and result

This report records local production-build, browser, package, and CI-equivalent
evidence for the storefront optimization in `docs/OPTIMIZATION.md`. It does not
authorize or record a production deployment or release any commerce flag.

Result: **pass**. Desktop homepage entry made 17 fewer fetches, transferred 6.1%
fewer encoded resource bytes, and avoided release-locked cart hydration.
Disabled customer-auth routes referenced 12.2% less client JavaScript. Core
commerce, accessibility, motion, auth, payment, money, and database boundaries
remained intact.

## Source identity

- Baseline Git SHA: `46ad43aebfe8ae670750b4c32f43bf37da34cd25`
- Lockfile SHA-256:
  `9c1a73d3e0e9c619c99958c6e2fb4c5f9efb18238cda79f71abe9a51b20161fd`
- Optimized implementation file-set SHA-256:
  `4072e3a7c6cc1c0afc6f842b4956cce584257a462089a12f602d11d0a164a1ea`
- Node: `24.18.0`
- pnpm: `11.1.3`
- Next.js: `16.2.11`
- agent-browser: `0.27.0`
- Browser user agent: HeadlessChrome `150.0.0.0` on macOS

The implementation hash covers these sorted paths, hashing each path, a null
byte, its full content, and another null byte:

```text
apps/storefront/app/api/cart/route.ts
apps/storefront/components/account-form.tsx
apps/storefront/components/cart-provider.tsx
apps/storefront/components/home-hero.tsx
apps/storefront/components/site-footer.tsx
apps/storefront/components/site-header.tsx
apps/storefront/components/storefront-shell.tsx
apps/storefront/lib/catalog-policy.ts
apps/storefront/lib/catalog.test.ts
apps/storefront/lib/catalog.ts
apps/storefront/lib/storefront-boundaries.integration.test.ts
knip.json
package.json
scripts/measure-storefront-browser.browser.js
scripts/measure-storefront-route-client-js.mjs
```

## Route client-JavaScript measurement

Build and measure:

```bash
pnpm build:storefront
pnpm storefront:measure-client > /tmp/storefront-route-client-after.json
pnpm storefront:verify-client-budget
(cd apps/storefront && pnpm next experimental-analyze --output)
```

Baseline comparison uses the same lockfile and measurement script against a
production build of baseline commit `46ad43aebfe8ae670750b4c32f43bf37da34cd25`.
Measurements sum unique uncompressed JavaScript chunks named by each generated
client-reference manifest.

| Route | Before | After | Change |
|---|---:|---:|---:|
| `/` | 213,449 B | 213,750 B | +301 B (`+0.14%`) |
| `/shop` | 208,064 B | 208,342 B | +278 B (`+0.13%`) |
| `/products/[slug]` | 227,126 B | 227,404 B | +278 B (`+0.12%`) |
| `/search` | 223,005 B | 223,283 B | +278 B (`+0.12%`) |
| `/cart` | 205,543 B | 205,821 B | +278 B (`+0.14%`) |
| `/checkout` | 223,290 B | 223,568 B | +278 B (`+0.12%`) |
| `/account/sign-in` | 252,997 B | 222,042 B | -30,955 B (`-12.2%`) |
| `/account/register` | 252,997 B | 222,042 B | -30,955 B (`-12.2%`) |
| `/account/recover` | 252,997 B | 222,042 B | -30,955 B (`-12.2%`) |

Seven route budgets run inside `pnpm check` after the storefront production
build. They guard homepage, shop, product, search, cart, checkout, and sign-in
client graphs.

## Browser network and runtime measurement

Start the production build locally without production credentials:

```bash
PORT=3000 \
STOREFRONT_URL='http://127.0.0.1:3000' \
CUSTOMER_AUTH_URL='http://127.0.0.1:3000' \
  pnpm start:storefront
```

Open a fresh agent-browser session at `http://127.0.0.1:3000`, set viewport to
`1280 × 633`, wait for the opening sequence and deferred motion imports, then
run `scripts/measure-storefront-browser.browser.js` with `eval --stdin`.

Comparable homepage entry:

| Metric | Before | After | Change |
|---|---:|---:|---:|
| Fetch count | 24 | 7 | -17 (`-70.8%`) |
| Fetch encoded bytes | 21,865 | 10,715 | -11,150 (`-51.0%`) |
| Fetch decoded bytes | 72,506 | 36,897 | -35,609 (`-49.1%`) |
| `/api/cart` requests | 1 | 0 | -1 |
| Script count | 16 | 13 | -3 |
| Script encoded bytes | 254,026 | 241,767 | -12,259 (`-4.8%`) |
| Script decoded bytes | 819,334 | 785,252 | -34,082 (`-4.2%`) |
| Total resource count | 49 | 28 | -21 (`-42.9%`) |
| Total encoded bytes | 387,152 | 363,424 | -23,728 (`-6.1%`) |
| Total decoded bytes | 1,097,943 | 1,027,933 | -70,010 (`-6.4%`) |
| CLS | 0 | 0 | unchanged |
| Long tasks | 0 | 0 | unchanged |

Warm local LCP samples were 184 ms before and 52–160 ms after. They prove no
local regression, not a production improvement: server warmth, browser cache,
and local transport make the exact difference non-causal. Production LCP/INP
still require later privacy-safe field telemetry.

Resource inspection showed remaining prefetches only for current route and the
primary `/shop` intent. Lower-intent primary destinations, closed mobile-menu
links, and footer links no longer trigger entry-time prefetch. When public and
preview catalog flags are false, the Server Component provides the exact
release-locked cart and no cart cookie/request is created. Enabled preview or
public catalog still uses the existing remote cart path.

## Responsive, interaction, motion, and accessibility checks

Authenticated state is neither required nor enabled for this fail-closed public
surface. Browser checks covered:

- desktop `1280 × 720` and narrow `390 × 844` layouts;
- primary and footer navigation after disabled automatic prefetch;
- cart drawer open, inert background, Escape close, and focus restoration to
  `Open cart with 0 items`;
- mobile navigation sheet open, Escape close, `aria-expanded=false`, and focus
  restoration to `Open navigation menu`;
- disabled account fields plus persistent customer-auth release explanation;
- disabled checkout plus server-owned release-block reason;
- no customer-auth request and no `/api/cart` request while both release flags
  are false;
- `prefers-reduced-motion: reduce`: opening intro absent, GSAP imports skipped,
  and maximum CSS motion duration `0.01 ms`;
- final homepage console and page-error buffers empty.

The homepage previously called GSAP with a null carousel-control target when
only the fallback hero existed. Guarding that optional target removed the two
browser warnings without changing the single-slide layout or multi-slide
animation.

## Evidence-led non-actions

- `next/image`, responsive `sizes`, local WebP files, and above-fold priority
  assignments were already correct; no image rewrite was applied.
- Manrope, Playfair Display, and Bebas Neue are self-hosted; no external font
  request exists. No font removal was justified.
- Catalog and durable-cart independent reads already use `Promise.all`.
  Published-data query deduplication was not changed without representative
  release data and a query trace.
- GSAP and ScrollTrigger already load dynamically and reduced-motion exits before
  import. Route-scoping or replacing motion lacked evidence and risked the
  locked animated presentation.
- Lazy-mounting the cart drawer risked first-open focus/inert behavior and shared
  Sheet code limited expected savings; it was not applied.
- A dynamic Cashfree import was built and tested. Turbopack still loaded its
  payment chunk on locked checkout entry, so the change was reverted.
- Knip `6.31.0` returned `{"issues":[]}`. No dependency or reachable file was
  removed.

## Package evidence

```bash
pnpm storefront:pack
```

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| Baseline storefront ZIP | 31,869,235 | `920160df4d0d44fb698ce4c7d1f0e1e4243f3080545b53b8a87249c836749f3f` |
| Final storefront ZIP | 31,880,510 | `181a95909c86be36c51810e65734b078c46994936fa4504fcff9287577f3bd5e` |

Final ZIP is 11,275 bytes (`0.04%`) larger because deferred code remains in the
artifact while cart guards and measurement support add code. Package validation
passed; no archive-size improvement is claimed.

## Final gates

```bash
pnpm check
TEST_DATABASE_URL='<migrated-disposable-loopback-url>' pnpm test:integration
TEST_DATABASE_URL='<migrated-disposable-loopback-url>' pnpm storefront:pack
DATABASE_URL_DIRECT='postgresql://unused:unused@127.0.0.1:1/unused' \
  pnpm dlx knip@6.31.0 --reporter json
git diff --check
```

All final commands passed, including 62 disposable-database integration tests.
No local server or disposable database remains after evidence capture.

No production deployment, provider action, production environment change, or
commerce-flag change occurred. Active Hostinger incident remains the deployment
blocker.
