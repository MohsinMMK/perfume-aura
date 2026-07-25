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
| Agent constraints | [../AGENTS.md](../AGENTS.md) |

## Current status — verified 2026-07-25

- Repository implements owner auth/recovery, inventory, customers, invoices, fulfillment, payments, finance, and health endpoints.
- Local/CI/package runtime is pinned to Node `24.18.0`; Hostinger target is Node `24.x`.
- Marketing is live: `/` returns `200`; blocked monorepo source paths return `403`.
- Ops `/login` returns `200`, but live deployment is stale: root and auth session return `500`; repository health routes return `404` because current code is not deployed.
- Latest listed Hostinger ops deployment is a completed archive deploy from 2026-07-23 using Node 20 and `apps/ops/server.js`.
- Supported ops release path is manual prebuilt ZIP upload (Path Z). GitHub source build (Path G) remains blocked.
- Production environment, staged migrations, runtime role, owner sign-in, and SMTP reset remain pending verification.

## Documentation rules

1. Code, migrations, tests, workflows, and dated live checks outrank prose.
2. Update one owning document; link instead of copying long procedures.
3. Product changes → `PRODUCT.md` and `ROADMAP.md`.
4. Schema, env, auth, test, or CI changes → `ENGINEERING.md`.
5. DNS, hosting, deployment, migration, or recovery changes → `OPERATIONS.md`.
6. Stack changes require a written decision in `STACK.md` and matching `AGENTS.md` rules.
7. Never record secrets, full connection URLs, passwords, or provider tokens.
