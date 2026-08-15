# Performance policy

Performance work is measurement-led. Preserve authentication, authorization,
money, database, release-lock, accessibility, and deployment contracts.

Do not deploy while `CURRENT_STATE.md` contains an active deployment blocker.

## Current baseline

- Next.js `16.2.11`, React `19.2.8`, App Router, and standalone output.
- Fonts are self-hosted with `next/font`.
- Storefront skips locked-cart hydration, limits low-intent prefetch, and defers
  disabled customer-auth code.
- Ops keeps dashboard-only tooltip/toast providers out of auth routes.
- Both applications make reduced-motion transitions effectively immediate.
- Client JavaScript budgets run after each production build.

These optimizations and route client-JavaScript budgets are present on `main`;
`pnpm check` enforces both budget scripts after production builds. This is a
repository baseline, not a claim about current field performance. Do not repeat
broad optimization without a measured regression or representative new release
data.

## Measure first

Use the same source SHA, Node/pnpm versions, build mode, fixture, route,
viewport, and throttling before and after a change.

```bash
pnpm build:storefront
pnpm storefront:measure-client
pnpm storefront:pack
pnpm build:ops
pnpm ops:measure-client
pnpm ops:pack
```

For browser journeys, record:

- LCP, INP, and CLS;
- transferred JavaScript and CSS;
- request waterfalls and long tasks;
- interaction commit time or dropped frames when relevant;
- functional, accessibility, and reduced-motion results.

Field targets at the 75th percentile are LCP ≤ 2.5 seconds, INP ≤ 200 ms,
and CLS ≤ 0.1. Lab TBT is only a proxy for INP.

## Change order

1. Trace route modules before changing imports or Client Component boundaries.
2. Remove duplicate or unnecessary work without weakening capability or data
   boundaries.
3. Fix proven slow interactions before adding memoization or concurrency APIs.
4. Animate only `transform` and `opacity` where behavior remains equivalent;
   preserve reduced motion.
5. Change fonts, icons, dependencies, or experimental Next.js options only
   through the reviewed stack process.

Generated analyzers, traces, and screenshots stay untracked. Short committed
attestations may preserve historical reproducibility under
[`evidence/optimization/`](evidence/optimization/), but they never override this
policy or `CURRENT_STATE.md`.

Historical attestations:

- [Storefront local E2E — 2026-08-03](evidence/optimization/STOREFRONT_LOCAL_E2E_2026-08-03.md)
- [Ops local E2E — 2026-08-03](evidence/optimization/OPS_LOCAL_E2E_2026-08-03.md)

## Acceptance record

For an implemented optimization, record:

```text
source SHA; route/journey; bottleneck; before; change; after;
functional checks; accessibility checks; security checks; commands; decision
```

Required verification:

```bash
pnpm check
TEST_DATABASE_URL='<disposable-loopback-url>' pnpm test:integration
git diff --check
```

Official references:

- [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Next.js package bundling](https://nextjs.org/docs/app/guides/package-bundling)
- [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading)
- [Next.js prefetching](https://nextjs.org/docs/app/guides/prefetching)
- [React Profiler](https://react.dev/reference/react/Profiler)
- [Web Vitals](https://web.dev/articles/vitals)
- [Reduced motion](https://web.dev/articles/prefers-reduced-motion)
- [Knip workspaces](https://knip.dev/features/monorepos-and-workspaces)
