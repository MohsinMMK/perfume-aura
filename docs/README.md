# Perfume Aura documentation

Current documentation only. Historical plans and remediation packets were removed after their verified conclusions were merged here; Git history remains the audit source.

## Read by task

| Need | Document |
|---|---|
| Product behavior, routes, workflows, terminology | [PRODUCT.md](./PRODUCT.md) |
| Architecture, data, auth, local development, tests, CI | [ENGINEERING.md](./ENGINEERING.md) |
| Hosting, DNS, deployment, database cutover, production recovery | [OPERATIONS.md](./OPERATIONS.md) |
| Completed capabilities and remaining work | [ROADMAP.md](./ROADMAP.md) |
| Locked stack and official tooling rules | [STACK.md](./STACK.md) |
| Commerce research, requirements, architecture, catalog, and verification | [commerce/README.md](./commerce/README.md) |
| Agent constraints | [../AGENTS.md](../AGENTS.md) |

## Current status

- Repository implements owner auth/recovery, inventory, customers, invoices, fulfillment, payments, finance, and health endpoints.
- Local/CI/package runtime is pinned to Node `24.18.0`; Hostinger target is Node `24.x`.
- Marketing collection preview is live via classic Git Path M (`main`); public allowlist serves assets and denies repo source paths.
- Ops production routine is Option 1-B: `main` push → verified pack → generated branch `hostinger-ops-production` → Hostinger Node GitHub App start. Two consecutive production webhook deployments passed 2026-07-31; Path Z remains emergency fallback only. Pure monorepo source build (Path G) remains blocked by esbuild EACCES.
- Repository variable `HOSTINGER_OPS_AUTO_DEPLOY_ENABLED=true` enables exact-SHA live polling after branch publication.
- Production migration automation is not part of the deploy workflow yet; schema-changing push-only release remains incomplete.
- SMTP reset and trusted-proxy proof remain pending.
- No public ecommerce storefront is implemented yet.

## Documentation rules

1. Code, migrations, tests, workflows, and dated live checks outrank prose.
2. Update one owning document; link instead of copying long procedures.
3. Product changes → `PRODUCT.md` and `ROADMAP.md`.
4. Schema, env, auth, test, or CI changes → `ENGINEERING.md`.
5. DNS, hosting, deployment, migration, or recovery changes → `OPERATIONS.md`.
6. Stack changes require a written decision in `STACK.md` and matching `AGENTS.md` rules.
7. Commerce planning and verification → `commerce/`; accepted product capability changes still update the owning current documents above.
8. Never record secrets, full connection URLs, passwords, or provider tokens.
