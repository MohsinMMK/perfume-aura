# Agent brief — pnpm monorepo

| Field | Value |
|-------|--------|
| Verdict | Recommend (locked) |
| Package manager | pnpm **11.x** (see root `packageManager`) |
| Workspace | `apps/*`, `packages/*` |

## Layout

```text
apps/marketing     # static brand
apps/ops           # Next.js ops
packages/ui        # shadcn @perfume-aura/ui
packages/db        # Drizzle + inventory
packages/validators
docs/              # product + tech docs
```

## Scripts (root)

| Script | Purpose |
|--------|---------|
| `pnpm dev:ops` | Next dev |
| `pnpm build:ops` | Production build |
| `pnpm db:generate` / `db:migrate` | Schema |
| `pnpm test` | Unit + integration |
| `pnpm marketing:sync` | Mirror marketing to root for classic Git |

## Deploy

- Marketing: artifact / root mirror → `public_html`  
- Ops: Hostinger Node, prefer monorepo root build with filter  
- Fallbacks: [../../OPS_DEPLOY_CHECKLIST.md](../../OPS_DEPLOY_CHECKLIST.md)  

## Rules

- `packages/db` owns migrations  
- UI has no secrets  
- Never deploy full monorepo into marketing `public_html`  
- Apps import drizzle operators from `@perfume-aura/db` (avoid dual drizzle copies)  
- shadcn CLI targets `apps/ops` config → files land in `packages/ui`  

## Related

- [../../ARCHITECTURE.md](../../ARCHITECTURE.md)  
- [./ui-shadcn-stack.md](./ui-shadcn-stack.md)  
