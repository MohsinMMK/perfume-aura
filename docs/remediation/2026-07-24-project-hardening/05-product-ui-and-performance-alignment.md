# Phase 05 — Product, UI, and performance alignment

## Objective

Align the implemented product lifecycle with honest UX, make interactions accessible through official shadcn Base UI composition, and remove avoidable server/query work without redesigning the product.

## Dependencies

Phases 01–04 interfaces stable. Use the migrated validators/actions rather than duplicating business rules in components.

## In scope

- Product/variant lifecycle gaps, archive safeguards, form/error/confirmation composition, pending feedback, button-link composition, print layout, route query performance, session deduplication, list pagination, and browser/accessibility tests.

## Out of scope

- A storefront, image/media system, bulk import, tax engine, new brand identity, paid analytics, or Vercel deployment.

## Confirmed evidence and root causes

- Product UI supports create/list/detail/add-variant/archive, while documentation sometimes calls it full CRUD. Product/variant editing, variant archive/restore, and safe archived-state handling are incomplete.
- Product archive cascades application status to variants without one transaction and without blocking on-hand/reserved stock.
- Invoice forms use raw labels/select composition instead of the installed `Field` and `NativeSelect`.
- Browser `confirm()`/`alert()` are used for destructive or result feedback.
- Some pending spinners lack `data-icon`.
- Multiple button-like links use `buttonVariants()` rather than Base UI's `Button render`.
- The print page uses forbidden `space-y-*`.
- Dashboard layout validates the session and then loads the entire dashboard stats query for every protected route; downstream data functions validate the same session again.
- Lists are unbounded; growing products/customers/invoices/payments/movements will increase render and query cost.

## Exact implementation decisions

1. Run official shadcn context, preset, docs, and dry-run commands before adding anything. Add `alert-dialog` only through the CLI into `packages/ui`; do not add `alert` unless a concrete implemented screen requires a persistent callout.
2. Refactor invoice/customer forms to `FieldGroup` → `Field` → `FieldLabel`/control/`FieldError`, with `data-invalid` and `aria-invalid`.
3. Replace destructive confirms with Base UI `AlertDialog`; use its `render` API, not Radix `asChild`. Disable the action while pending and restore focus after close.
4. Replace result alerts with the existing Sonner toaster. Use `Alert` for persistent form-level errors.
5. Add `data-icon="inline-start"` to pending spinners and use `Button render={<Link ... />}` with `nativeButton={false}` for button links.
6. Replace `space-y-*` with flex/grid gaps. Preserve a documented print-only neutral palette; use semantic tokens elsewhere.
7. Implement product and variant edit plus variant archive/restore using authenticated server actions and shared validators. Never hard-delete.
8. Archive a product and its active variants atomically even when stock remains, without changing balances. Keep archived stock visible in detail/history and the ledger, exclude it from new transaction selectors, and require explicit per-variant reactivation after the product is reactivated.
9. Add status filters that make archived records discoverable without mixing them into default active lists.
10. Add bounded server pagination with URL search params and stable database ordering for products, customers, invoices, payments, and movements. Preserve filtering terms across pages.
11. Wrap per-request session lookup in React `cache()` and reuse it. Replace the layout's full dashboard-stat fetch with a purpose-specific low-stock count or defer it behind a small server component/Suspense boundary.
12. Keep independent reads parallel with `Promise.all`; do not serialize them accidentally. Keep Server Components by default and minimize client props/bundles.

## Affected subsystems

Product/customer/invoice components and actions, shared UI package, route pages/layout, validators, queries/indexes, accessibility behavior, tests, and product documentation.

## Official documentation

- shadcn monorepo: https://ui.shadcn.com/docs/monorepo
- shadcn CLI: https://ui.shadcn.com/docs/cli
- Alert Dialog: https://ui.shadcn.com/docs/components/base/alert-dialog
- Field: https://ui.shadcn.com/docs/components/base/field
- Alert: https://ui.shadcn.com/docs/components/base/alert
- Spinner: https://ui.shadcn.com/docs/components/base/spinner
- Next.js server/client components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js data fetching: https://nextjs.org/docs/app/getting-started/fetching-data
- React `cache`: https://react.dev/reference/react/cache
- Next.js accessibility: https://nextjs.org/docs/architecture/accessibility

## Required project skills

`shadcn`, `vercel-react-best-practices`, `vercel-composition-patterns`, and `playwright` for browser verification.

## Commands and test cases

```bash
pnpm dlx shadcn@latest info -c apps/ops --json
pnpm dlx shadcn@latest preset resolve -c apps/ops
pnpm dlx shadcn@latest docs alert-dialog field native-select spinner -c apps/ops
pnpm dlx shadcn@latest add alert-dialog -c apps/ops --dry-run -y
pnpm dlx shadcn@latest add alert-dialog -c apps/ops -y
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build:ops
```

Browser tests cover keyboard-only dialog use, focus return, invalid fields, pending double-submit prevention, archived-stock visibility and selector exclusion, product/variant edit/archive/restore, pagination/filter URLs, responsive widths, print view, login redirect, and no console/hydration errors.

## Rollback

Revert each bounded UI/product/query commit independently. Database fields remain forward-compatible. Keep old routes available until browser tests prove replacements. Do not roll back by reintroducing native confirms around irreversible actions.

## Completion evidence

- Preset resolves to `b23PPibQOI` with no fallback.
- CLI-added files land only in `packages/ui`.
- Product capability claims match tested behavior.
- Accessibility/browser tests and build pass.
- Query count/timing evidence shows no repeated session lookup or full dashboard query per protected page.

## Prohibited shortcuts

- No hand-copied shadcn components, bulk registry install, raw styled substitute, Radix API on Base UI, or arbitrary color redesign.
- No client-only authorization.
- No unbounded list or destructive product delete.
- No performance claim without before/after evidence.

## Ready-to-run normal sub-agent prompt

> Read `/Users/mohsinkhan/Documents/Perfume Aura/AGENTS.md` and this complete Phase 05 file. Use the shadcn and Vercel skills and official CLI workflow. Implement only the specified product lifecycle, accessible UI composition, pagination, session/query deduplication, and tests. Preserve the locked preset and marketing design. Run a real local browser flow with console inspection. Do not deploy, edit provider state, stage, or commit. Return CLI destinations, screenshots/test evidence, query evidence, and remaining UX gaps.
