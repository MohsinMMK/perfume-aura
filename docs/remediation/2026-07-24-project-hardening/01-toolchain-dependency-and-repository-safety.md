# Phase 01 — Toolchain, dependency, and repository safety

## Objective

Align every build surface on Node `24.18.0`, remove known high-severity dependency exposure, and prevent local tooling, secrets, or monorepo source from entering Git or the marketing web surface.

## Dependencies

Phase 00 complete. Run before schema or application refactors so later evidence uses the final runtime and lockfile.

## In scope

- Node/pnpm metadata, dependency manifests and lockfile.
- Audit remediation.
- `.gitignore`, local secret permissions, marketing deny rules, and scoped staging guidance.
- Removal of runtime-unneeded CLI dependencies from production dependency sets.

## Out of scope

- Better Auth behavior changes, which belong to Phase 04.
- Business schema/workflow changes.
- Provider runtime, DNS, deployment, or secret changes.

## Confirmed evidence and root causes

- CI uses Node 22, Hostinger was documented as Node 20, and local execution was not pinned.
- The approved target is now Node `24.18.0` for local, CI, archive creation, and Hostinger `24.x`.
- `pnpm audit --json` on 2026-07-24 reported 6 high and 8 moderate advisories. High findings include Next.js `16.2.10`, Sharp `0.34.5`, and PostCSS `8.4.31`; the audit identifies patched floors of Next.js `16.2.11`, Sharp `0.35.0`, and PostCSS `8.5.12`.
- `shadcn` is a CLI/build tool but is currently a production dependency of `@perfume-aura/ui`, pulling unrelated CLI/MCP dependencies into the production dependency graph.
- `.claude/`, `.pi/`, and `.pi-subagents/` are untracked but not ignored.
- `apps/ops/.env.local` exists with permissive local mode `0644`; its values must not be printed.
- marketing `.htaccess` blocks `.pi` and `.claude` but not `.pi-subagents`.
- `docs/DEPLOY.md` recommends `git add .`, which can capture local transcripts or secrets.

## Exact implementation decisions

1. Add `.nvmrc` and `.node-version`, each containing `24.18.0`.
2. Add root `engines.node` as `>=24.18.0 <25`; retain `packageManager: pnpm@11.1.3`.
3. Update Next.js and `eslint-config-next` together to exactly `16.2.11`.
4. Move `shadcn` from `packages/ui` production dependencies to dev dependencies.
5. Resolve Sharp to exactly `0.35.3` and PostCSS to exactly `8.5.22` through targeted root pnpm overrides. Use `pnpm why` before and after the override and assert the resolved versions in the package smoke.
6. Defer Better Auth to Phase 04, where it is pinned to `1.6.25`.
7. Add `.claude/`, `.pi/`, and `.pi-subagents/` to `.gitignore`.
8. Add `.pi-subagents` to the source `apps/marketing/.htaccess`, then run `pnpm marketing:sync`; never hand-edit root `.htaccess`.
9. Change local `apps/ops/.env.local` mode to `0600`. This is a local safety action and is not committed.
10. Replace all `git add .` instructions with explicit path lists.
11. Do not suppress GitHub advisory IDs or use `pnpm audit --fix --force`.

## Affected subsystems

Root/package manifests, pnpm lockfile, Next.js, Sharp packaging, UI development tooling, Git ignore policy, marketing HTTP isolation, and deployment documentation.

## Official documentation

- Node releases: https://nodejs.org/en/about/previous-releases
- pnpm install/frozen lockfile: https://pnpm.io/cli/install
- pnpm audit: https://pnpm.io/cli/audit
- pnpm overrides: https://pnpm.io/settings#overrides
- Next.js upgrade guide: https://nextjs.org/docs/app/guides/upgrading
- Next.js security advisories: https://github.com/vercel/next.js/security/advisories
- shadcn CLI: https://ui.shadcn.com/docs/cli
- Apache `.htaccess`: https://httpd.apache.org/docs/2.4/howto/htaccess.html
- Apache authorization: https://httpd.apache.org/docs/2.4/mod/mod_authz_core.html
- Rewrite flags: https://httpd.apache.org/docs/current/rewrite/flags.html

## Required project skills

`shadcn` for CLI placement verification and `vercel-react-best-practices` for compatible Next.js review.

## Commands and test cases

```bash
node --version
pnpm --version
pnpm outdated --recursive
pnpm why next sharp postcss shadcn
pnpm install --lockfile-only
pnpm install --frozen-lockfile
pnpm audit --json
pnpm audit --prod --audit-level=high
chmod 600 apps/ops/.env.local
pnpm marketing:sync
pnpm marketing:check
git check-ignore -v .claude .pi .pi-subagents
git diff --check
```

Test the deny source locally and, after an authorized marketing deployment, expect `403` for `/apps/ops/package.json`, `/.gitignore`, and any committed protected tool path. A static-only future deployment may correctly return `404`.

## Rollback

Restore the prior manifests and lockfile together, restore prior Node metadata, and rerun `pnpm install --frozen-lockfile`. Revert the source `.htaccess` and regenerate root files with `pnpm marketing:sync`. Do not loosen local secret permissions during rollback.

## Completion evidence

- `node --version` is `v24.18.0`.
- A clean frozen install succeeds.
- Audit has no high or critical finding; remaining lower findings are individually documented.
- `pnpm marketing:check`, repository tests, build, and `git diff --check` pass.
- Only deliberate files are tracked; local agent folders are ignored and preserved.

## Prohibited shortcuts

- No major-version bulk update.
- No mismatched `next`/`eslint-config-next`.
- No blanket overrides or advisory ignores.
- No hand-editing generated marketing root files.
- No printing or committing environment values.

## Ready-to-run normal sub-agent prompt

> Read `/Users/mohsinkhan/Documents/Perfume Aura/AGENTS.md` and this complete Phase 01 file. Implement only Node/toolchain, dependency, audit, ignore, local permission, marketing deny-source, and scoped-staging changes on `codex/project-hardening`. Preserve `.claude/`, `.pi/`, and `.pi-subagents/`; do not inspect their private contents. Use official pnpm/Next/shadcn paths, update the lockfile intentionally, and do not change provider state. Run every Phase 01 gate and return the exact diff, advisory results, and rollback notes. Do not stage or commit.
