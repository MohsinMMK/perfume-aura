# Performance optimization plan

## Purpose and scope

This document owns performance optimization for `apps/ops` and
`apps/storefront`: download and artifact size, load speed, interaction
responsiveness, rendering cost, and motion smoothness. It is measurement-led;
each implementation record states what was proven locally or in CI.

The plan must preserve behavior, security boundaries, accessibility, database
semantics, storefront release locks, and the locked stack in `docs/STACK.md`.
Do not deploy either application while the active incident in
`docs/CURRENT_STATE.md` blocks deployment.

## Current baseline facts

Static review found:

- Next.js `16.2.11`, React `19.2.8`, App Router, and standalone output;
- `next/font` loading IBM Plex Sans and Raleway in the root layout;
- 27 files declaring a Client Component boundary;
- existing parallel data reads using `Promise.all`;
- no current `next/dynamic` import in `apps/ops`;
- Hugeicons imports in the client-facing component graph.

These are audit inputs, not defects. Bundle, browser, and production-like route
measurements must prove each bottleneck before code changes.

## Non-negotiable gates

1. Keep auth, capability checks, server-authoritative money, restricted database
   access, and owner/staff separation unchanged.
2. Keep semantic controls, visible focus, persistent labels, 44px targets,
   reduced-motion behavior, and mobile usability.
3. Compare before and after under the same Node version, dependency lockfile,
   build mode, route, data fixture, browser profile, viewport, and throttling.
4. Change one bottleneck class at a time. Revert changes that do not improve the
   measured target or that regress another accepted metric.
5. Do not add an experimental Next.js production option without explicit review.
   Official docs currently mark `experimental.optimizePackageImports` as
   experimental and not recommended for production.
6. Do not change Next.js, React, shadcn, fonts, icon libraries, or deployment
   topology as part of cleanup without the separate reviewed decision required
   by `docs/STACK.md`.
7. Performance telemetry must exclude credentials, session values, customer
   data, invoice contents, and other sensitive business data.

## Measurement protocol

Create an evidence record for every optimization pass. Store generated analyzer
or trace artifacts outside tracked source unless a review explicitly requests a
small checked-in report.

### Build and artifact evidence

Run from a clean tree:

```bash
pnpm build:storefront
(cd apps/storefront && pnpm next experimental-analyze --output)
pnpm storefront:pack
pnpm build:ops
(cd apps/ops && pnpm next experimental-analyze --output)
pnpm ops:pack
```

Record:

- source SHA and lockfile SHA-256;
- Node and pnpm versions;
- analyzer output path and route under review;
- client JavaScript, CSS, and relevant module contributors by route;
- standalone and deployment archive byte sizes;
- build duration only as diagnostic context, not user-speed proof.

Next.js 16 removed the old build-output `First Load JS` metric because it was
not reliable for Server Component applications. Use the official bundle
analyzer for module tracing and browser measurements for actual route cost.

### Browser evidence

Measure production-build journeys on representative desktop and mobile
profiles. For ops, authenticate with synthetic disposable-fixture credentials
and cover:

- login to dashboard;
- dashboard navigation to products, stock, invoices, payments, and finance;
- table search/filter/pagination;
- product or customer edit;
- invoice drafting and payment recording;
- sidebar open/close and other visible transitions.

For storefront, preserve current release locks and cover:

- homepage, shop, search, product/collection, cart, checkout, and account routes;
- resource transfer, route prefetch, images, fonts, and optional SDK loading;
- header/footer navigation, cart drawer, mobile menu, focus restoration, and
  reduced-motion behavior;
- enabled catalog/cart/checkout journeys only when an approved disposable
  fixture can reproduce those release states.

Capture:

- LCP, INP, and CLS;
- transferred JavaScript and CSS per route;
- request waterfall and long main-thread tasks;
- React commit durations for interactions proven slow;
- dropped frames, layout work, and paint/composite cost during motion.

Use field data when a privacy-safe authenticated telemetry path exists. Lab data
catches regressions but does not replace field data. Lighthouse cannot directly
measure INP without real input; use its TBT result only as a lab proxy.

Core Web Vitals acceptance target at the 75th percentile:

- LCP at or below 2.5 seconds;
- INP at or below 200 milliseconds;
- CLS at or below 0.1.

## Optimization order

### 1. Remove proven client bundle waste

Use the Next.js analyzer to trace large route modules before editing imports.
For each proven contributor:

- move non-interactive transformation or rendering back to a Server Component;
- keep Client Component boundaries as narrow as practical;
- dynamically load only heavy optional Client Components or libraries that are
  not needed for first interaction;
- avoid blanket dynamic imports, especially for Server Components;
- inspect icon-package contribution before considering import changes;
- use `pnpm --filter @perfume-aura/ops why <package>` and the manifest to prove
  ownership before removing an unused dependency, then use filtered `pnpm
  remove` rather than editing lockfiles.

Do not enable `experimental.optimizePackageImports` merely because Hugeicons has
many exports. Official Next.js guidance requires treating that option as
experimental; analyzer evidence and explicit production review are prerequisites.

### 2. Reduce server and network delay

Profile route waterfalls before changing data access. Preserve capability checks
and transactional boundaries. Then:

- keep independent reads parallel;
- defer work until the branch that needs it;
- avoid duplicate request-scoped reads when framework-supported deduplication is
  valid;
- reduce serialized data passed into Client Components;
- paginate operational lists instead of expanding initial payloads.

Database indexes, caching, and query-shape changes require their own correctness
and authorization review. Faster stale or over-broad data is a regression.

### 3. Improve interaction responsiveness

Use React DevTools and `<Profiler>` only around interactions that reproduce a
slow commit. Profiling adds overhead and is disabled in normal production builds.

For measured bottlenecks:

- remove unnecessary Effects and derived state before adding memoization;
- use `memo` only when stable props and skipped render work justify it;
- use `useTransition` for non-urgent state updates that should not block input;
- use `useDeferredValue` when expensive result rendering may lag behind direct
  input, with an accessible stale/loading indication;
- keep form submission, validation, destructive confirmation, and auth state
  urgent and explicit.

### 4. Make motion smooth without adding motion

Audit existing state transitions; do not add decorative animation. For each
measured jank source:

- prefer `transform` and `opacity` when they express the same state change;
- avoid layout-triggering animation where possible;
- inspect paint-heavy blur, shadow, and filter regions in browser performance
  tools;
- keep `will-change` scoped and temporary, never global;
- preserve a `prefers-reduced-motion` alternative;
- verify focus, drawer inertness, and content visibility after every change.

Use `content-visibility` only for proven long off-screen content, with layout and
accessibility verification. Do not apply it globally or to active forms.

### 5. Verify font cost and stability

Keep `next/font`, which self-hosts fonts and avoids external font requests.
Measure loaded files and glyph/weight use. Remove an unused family, style, or
weight only after route-level evidence proves it unused and visual review proves
no typography change. Preserve reserved space and confirm CLS remains within the
accepted target.

## Acceptance record template

Copy this section for each implemented optimization:

```md
### <change name>

- Source SHA:
- Route and journey:
- Bottleneck evidence:
- Official guidance used:
- Before: JS/CSS bytes, LCP, INP or TBT, CLS, commit/frame evidence
- Change:
- After: JS/CSS bytes, LCP, INP or TBT, CLS, commit/frame evidence
- Functional checks:
- Accessibility and reduced-motion checks:
- Security/data-boundary checks:
- Commands run:
- Residual risk:
- Decision: keep or revert
```

## Implementation records

### Scope dashboard-only client providers away from authentication routes

- Baseline source SHA: `d3b95b73b60f74882f205c798d09828cfb127d5e`
- Current implementation file-set SHA-256:
  `284ed2d7d919fd2a56f043e1622c5594fbe7ec2b8500194df4de3510385898ea`
- Lockfile SHA-256:
  `9c1a73d3e0e9c619c99958c6e2fb4c5f9efb18238cda79f71abe9a51b20161fd`
- Environment: Node `24.18.0`, pnpm `11.1.3`, Next.js `16.2.11`
- Routes and journeys: `/login`, `/forgot-password`, `/reset-password`,
  `/two-factor`, and the authenticated dashboard shell
- Bottleneck evidence: the root layout mounted `TooltipProvider` and `Toaster`
  on every route, while static usage review found tooltip and toast consumers
  only in the authenticated dashboard tree. The Next.js analyzer attributed two
  avoidable client chunks and 139,059 bytes of uncompressed route-referenced
  client JavaScript to every authentication route.
- Official guidance used: [Next.js package bundling](https://nextjs.org/docs/app/guides/package-bundling)
  and [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- Before:
  - `/login`: 313,965 bytes of route-referenced client JavaScript
  - `/forgot-password`: 310,382 bytes
  - `/reset-password`: 312,817 bytes
  - `/two-factor`: 304,893 bytes
  - dashboard base route: 376,742 bytes
  - standalone ZIP: 26,820,734 bytes
- Change: moved `TooltipProvider` and `Toaster` from the root layout into
  `AppShell`, preserving both providers for authenticated routes while removing
  them from authentication routes. Added a source contract test for this scope.
- After:
  - `/login`: 174,906 bytes, down 44.3%
  - `/forgot-password`: 171,323 bytes, down 44.8%
  - `/reset-password`: 173,758 bytes, down 44.5%
  - `/two-factor`: 165,834 bytes, down 45.6%
  - dashboard base route: 376,681 bytes, effectively unchanged
  - standalone ZIP: 26,815,702 bytes, down 5,032 bytes; archive size was not the
    primary target because dashboard routes still require both providers
- Reproducible evidence: `pnpm ops:measure-client` emits deterministic per-route
  client JavaScript and chunk data after an ops build. Exact baseline worktree,
  fixture, browser, artifact checksum, and cleanup steps are recorded in
  [`docs/optimization/OPS_LOCAL_E2E_2026-08-03.md`](optimization/OPS_LOCAL_E2E_2026-08-03.md).
  Analyzer output remains generated and untracked.
- Commands:

  ```bash
  pnpm --filter @perfume-aura/ops build
  (cd apps/ops && pnpm next experimental-analyze --output)
  pnpm ops:measure-client
  pnpm ops:pack
  pnpm --filter @perfume-aura/ops exec tsx --test lib/phase05-ui-contract.test.ts
  pnpm check
  TEST_DATABASE_URL='<migrated-disposable-loopback-url>' pnpm test:integration
  git diff --check
  ```

- Functional checks: optimized production build, analyzer comparison, package
  stage/ZIP smoke, strengthened UI contract test, and local production `/login`
  browser QA passed without console, page, or network errors.
- Accessibility and reduced-motion checks: login labels, controls, focusable
  elements, and visual layout remained present. No motion code changed because
  no motion bottleneck was measured.
- Security/data-boundary checks: auth, session, capability, database, and money
  code did not change. No credentials or customer data entered measurement
  artifacts.
- Authenticated completion: disposable-fixture owner sign-in, dashboard shell,
  collapsed-sidebar tooltip, success toast, keyboard sidebar toggle, mobile
  drawer, and core products/stock/invoices/finance/customers routes passed.
- Residual risk: no production field telemetry was collected. Production
  deployment remains blocked by the active Hostinger incident.
- Decision: keep. Authentication routes remove 139,059 bytes of unnecessary
  client JavaScript without increasing dashboard cost or changing behavior.

### Make state motion immediate for reduced-motion users

- Baseline source SHA: `d3b95b73b60f74882f205c798d09828cfb127d5e`
- Routes and journeys: authenticated dashboard shell on desktop and mobile,
  including sidebar collapse, mobile drawer, tooltip, and toast feedback
- Bottleneck evidence: with `prefers-reduced-motion: reduce`, computed sidebar,
  sheet, card, badge, and control transitions still ran for 150–200 ms. This
  contradicted the repository requirement that motion respect reduced-motion
  preferences.
- Official guidance used: [web.dev `prefers-reduced-motion`](https://web.dev/articles/prefers-reduced-motion)
  and [Tailwind reduced-motion variants](https://tailwindcss.com/docs/hover-focus-and-other-states#prefers-reduced-motion)
- Change: added an ops-scoped reduced-motion media query that makes animation
  and transition duration 0.01 ms, removes transition delay, prevents repeated
  animation, and disables smooth scrolling. Normal-motion styles are unchanged.
- Before:
  - reduced-motion sidebar and sheet transitions: 150–200 ms
  - decoded route CSS: 83,828 bytes; encoded response body: 14,996 bytes
- After:
  - maximum computed reduced-motion transition and animation: 0.01 ms
  - normal-motion sidebar transitions: unchanged at 150–200 ms
  - decoded route CSS: 84,055 bytes, up 227 bytes
  - encoded response body: 15,053 bytes, up 57 bytes
  - `/login` route client JavaScript: unchanged at 174,906 bytes
  - dashboard route client JavaScript: unchanged at 376,681 bytes
- Authenticated browser evidence:
  - synthetic owner sign-in succeeded against a migrated disposable loopback
    database and approved `http://localhost:3000` test origin;
  - warm, unthrottled local dashboard load recorded LCP 136 ms, CLS 0, and no
    long tasks; these lab values are diagnostic only, not production claims;
  - initial dashboard resources included 249,182 encoded JavaScript bytes and
    15,053 encoded CSS bytes from warm local cache metadata;
  - product creation and archive produced an accessible `Product archived`
    toast with close control;
  - collapsed sidebar exposed the Products tooltip, keyboard Enter toggled the
    sidebar while retaining trigger focus, and mobile drawer content remained
    reachable;
  - reduced motion intentionally leaves indeterminate spinner icons static;
    pending controls retain visible action text and focus-preserving disabled
    state;
  - dashboard, products, stock, invoices, finance, and customers loaded without
    actionable console, page, or network errors.
- Package evidence: final standalone ZIP was 26,815,747 bytes. Stage, extracted
  ZIP, and guarded server smoke passed for `/login`, ready, session, version,
  and static-asset endpoints.
- Functional and security checks: `pnpm check`, the full integration suite on a
  separate migrated disposable loopback database, `git diff --check`, analyzer,
  package smoke, and browser journeys passed. No auth, capability, database,
  money, or deployment code changed. Synthetic fixture data and credentials
  were local and disposable. The optimized build used `NODE_ENV=test` only at
  local runtime so the security policy would accept its fixed localhost origin.
  Both disposable databases were dropped and local test ports were closed.
- Residual risk: production Core Web Vitals and real-device INP require
  privacy-safe field telemetry after the Hostinger incident is repaired. No
  additional code change was justified by current traces.
- Decision: keep. Reduced-motion behavior now follows the user preference for a
  57-byte encoded CSS cost without changing normal motion.

### Remove statically proven dead code and public API surface

- Audit tooling: Knip `6.31.0`, using its official Next.js/workspace graph plus
  repository-wide symbol searches and existing Next.js production builds.
- Before: Knip reported 13 unused exports/types across storefront, ops, and the
  database package, one entirely unreachable Cashfree refund lookup, two
  repository entry-point false positives, and one intentional validator alias.
  It reported no unused package dependency.
- Change:
  - deleted unreachable `getCashfreeRefund`; kept refund creation and webhook
    verification behavior unchanged;
  - made 12 internally consumed constants, functions, and types private rather
    than exporting unsupported API surface;
  - added `knip.json` entry declarations for the browser measurement program and
    Phase 02 Drizzle test config;
  - marked the intentional archive/reactivate schema alias with Knip's
    symbol-local `@alias` tag, preserving one runtime schema and distinct action
    names without suppressing future duplicate findings.
- After: `pnpm dlx knip@6.31.0 --reporter json` returned `{"issues":[]}` with
  no ignored issue category when given a syntactically valid non-production
  direct database URL for config loading. Dead-helper removal cut 18 net lines
  and 593 bytes from the Cashfree
  module. No dependency or reachable file was removed.
- Client evidence: all measured routes lost another 24 bytes of referenced
  client JavaScript. Final totals are `/login` 174,882 bytes,
  `/forgot-password` 171,299 bytes, `/reset-password` 173,734 bytes,
  `/two-factor` 165,810 bytes, and dashboard 376,657 bytes.
- Package evidence: final ops standalone ZIP was 26,815,421 bytes, 326 bytes
  smaller than the pre-cleanup optimized package. Storefront package validation
  passed; dead server helper removal makes no storefront bundle-size claim
  because production tree shaking had already excluded it.
- Verification: `pnpm check`, 60 disposable-database integration tests, both
  package workflows, ops stage/ZIP/server smoke, client budgets, and
  `git diff --check` passed. Cleanup did not alter auth, capability, database,
  money, release-lock, or deployment behavior.
- Official guidance used: [Knip monorepos and workspaces](https://knip.dev/features/monorepos-and-workspaces),
  [Knip configuration](https://knip.dev/reference/configuration), and
  [Next.js project structure](https://nextjs.org/docs/app/getting-started/project-structure).
- Decision: keep. Audit is clean after explicit entry/alias accounting; no
  speculative dependency or reachable-code deletion was applied.

## Storefront measured optimization — 2026-08-03

Detailed reproduction evidence: [`docs/optimization/STOREFRONT_LOCAL_E2E_2026-08-03.md`](optimization/STOREFRONT_LOCAL_E2E_2026-08-03.md).
Baseline source was commit `46ad43aebfe8ae670750b4c32f43bf37da34cd25`;
optimized implementation file-set SHA-256 is
`4072e3a7c6cc1c0afc6f842b4956cce584257a462089a12f602d11d0a164a1ea`.

### Initial navigation and locked-cart work

- Before: desktop homepage entry issued 24 fetches, including one unconditional
  `/api/cart` request and viewport prefetches for five primary destinations.
  Fetch transfer was 21,865 encoded / 72,506 decoded bytes.
- Change: preserve automatic prefetch only for primary `/shop` intent; disable it
  for lower-intent primary, closed-menu, and footer links. When public and
  preview catalog flags are both false, initialize the exact release-locked cart
  snapshot in the Server Component and skip remote hydration. Enabled preview or
  public commerce retains remote cart loading; abandoned loads now abort.
- After at the same `1280 × 633` local viewport: 7 route-prefetch fetches, no
  `/api/cart` request, and 10,715 encoded / 36,897 decoded fetch bytes. That is
  17 fewer requests (`-70.8%`) and `-51.0%` encoded fetch transfer.
- Whole-page resources fell from 49 to 28 entries, 387,152 to 363,424 encoded
  bytes (`-6.1%`), and 1,097,943 to 1,027,933 decoded bytes (`-6.4%`).

### Release-gated client code

- Before: disabled sign-in, registration, and recovery routes each referenced
  252,997 bytes of client JavaScript because the Better Auth client was imported
  statically even though disabled controls could not invoke it.
- Change: dynamically import the isolated customer-auth client only after the
  explicit enabled-action guard.
- After: each route references 222,042 bytes, saving 30,955 bytes (`-12.2%`).
  Other guarded commerce routes changed by only 278–301 bytes (`<0.15%`) for the
  cart-loading guard and measurement code.
- A proposed Cashfree client split was built and browser-tested, then reverted:
  Turbopack still loaded the dynamic payment chunk on locked checkout entry, so
  no initial-load benefit was proven.

### Media, rendering, motion, and regression control

- All storefront images already use `next/image`, explicit responsive `sizes`,
  local WebP assets, and priority only for credible above-fold candidates.
  Fonts are self-hosted. No measured media or font change was justified.
- Catalog and durable-cart independent reads already use `Promise.all`; release
  gates return before database/payment/auth initialization. Release-only query
  deduplication remains deferred until representative published data can prove a
  latency bottleneck.
- GSAP and ScrollTrigger remain dynamically loaded and are skipped for reduced
  motion. One null-target hero animation call was guarded; final browser run had
  no console or page errors. Reduced-motion CSS remained `0.01 ms`.
- Added deterministic storefront route measurement, seven CI budgets, and a
  reusable browser diagnostic program. `pnpm check` now verifies storefront
  budgets after its production build.
- Final storefront ZIP was 31,880,510 bytes, 11,275 bytes (`0.04%`) above the
  baseline because deferred code remains packaged and guard/measurement support
  was added. No archive-size improvement is claimed.
- Knip `6.31.0` returned `{"issues":[]}`. No dependency or reachable file was
  removed. No production/provider change occurred.

## Required verification for implementation work

```bash
pnpm check
TEST_DATABASE_URL='<disposable-loopback-url>' pnpm test:integration
git diff --check
```

Also repeat affected authenticated journeys, compare analyzer and browser
artifacts, and verify the clean standalone package before merge. Production
verification remains governed by `docs/OPERATIONS.md` and the active incident
gate in `docs/CURRENT_STATE.md`.

## Official references

Only official project or browser-platform documentation should justify changes
made under this plan.

| Topic | Official source | Use in this plan |
|---|---|---|
| Next.js production review | [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist) | Production measurement, Core Web Vitals, fonts, scripts, images, accessibility |
| Bundle inspection | [Next.js package bundling](https://nextjs.org/docs/app/guides/package-bundling) | Turbopack analyzer, module tracing, large client workloads, package exports |
| Optional client code | [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading) | `next/dynamic` and dynamic library imports with Server Component limits |
| Navigation prefetch | [Next.js prefetching guide](https://nextjs.org/docs/app/guides/prefetching) | Keep high-intent navigation fast without eagerly fetching every low-intent link |
| Component boundaries | [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) | Narrow Client Component boundaries and reduce client JavaScript |
| Font loading | [Next.js font optimization](https://nextjs.org/docs/app/getting-started/fonts) | Self-hosting, external-request removal, and layout stability |
| Experimental package imports | [Next.js `optimizePackageImports`](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports) | Experimental status and required caution |
| Runtime metrics | [Next.js `useReportWebVitals`](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals) | Privacy-safe field metric reporting with isolated client boundary |
| Render measurement | [React `<Profiler>`](https://react.dev/reference/react/Profiler) | Commit-duration evidence and profiling caveats |
| Render skipping | [React `memo`](https://react.dev/reference/react/memo) | Evidence-gated render memoization |
| Non-urgent updates | [React `useTransition`](https://react.dev/reference/react/useTransition) | Keep urgent input responsive during background rendering |
| Deferred result rendering | [React `useDeferredValue`](https://react.dev/reference/react/useDeferredValue) | Defer expensive result views while identifying stale content |
| Core Web Vitals | [web.dev Web Vitals](https://web.dev/articles/vitals) | LCP, INP, CLS thresholds; field and lab measurement roles |
| Animation performance | [web.dev high-performance CSS animations](https://web.dev/articles/animations-guide) | Diagnose rendering stages and avoid layout/paint-heavy motion |
| Reduced motion | [web.dev `prefers-reduced-motion`](https://web.dev/articles/prefers-reduced-motion) | Required motion preference behavior |
| Reduced-motion utilities | [Tailwind reduced-motion variants](https://tailwindcss.com/docs/hover-focus-and-other-states#prefers-reduced-motion) | Framework-supported conditional motion styling |
| Dashboard navigation | [shadcn/ui Base UI Sidebar](https://ui.shadcn.com/docs/components/base/sidebar) | Official sidebar composition and provider contract |
| Off-screen rendering | [web.dev `content-visibility`](https://web.dev/articles/content-visibility) | Conditional long-content rendering optimization and caveats |
| Dead-code graph | [Knip monorepos and workspaces](https://knip.dev/features/monorepos-and-workspaces) | Find unreachable files, exports, types, and dependencies with workspace-aware entries |
| Dead-code exceptions | [Knip configuration](https://knip.dev/reference/configuration) | Declare non-imported executable entries and narrow intentional issue exceptions |
| Dependency ownership | [pnpm `why`](https://pnpm.io/cli/why) | Prove why a dependency exists before cleanup |
| Dependency removal | [pnpm `remove`](https://pnpm.io/cli/remove) | Official workspace-safe dependency removal path |
