# Agent brief — Drizzle + Neon

| Field | Value |
|-------|--------|
| Verdict | Recommend (locked) |
| Score | 5/5 |
| Docs | https://orm.drizzle.team/docs/connect-neon · https://neon.com/docs |
| Package | `@perfume-aura/db` |

## Stock writes

Use **`pg` Pool** (`drizzle-orm/node-postgres`) for interactive `db.transaction` + `FOR UPDATE`.  

**Do not** use `neon-http` / `@neondatabase/serverless` HTTP for multi-step stock.

As-built: `packages/db/src/client.ts` + `inventory.ts` (`applyMovement`).

## Connection URLs

| URL | Use |
|-----|-----|
| `DATABASE_URL` | Pooled — app runtime |
| `DATABASE_URL_DIRECT` | Direct — `drizzle-kit migrate` |

## Migrations

```bash
pnpm db:generate
pnpm db:migrate
pnpm --filter @perfume-aura/db seed   # MAIN location
```

## Pin

- drizzle-orm **0.45.x** (Better Auth peer)  
- `pg` driver for pool  

## Invariants

Documented in [../../DATA_MODEL.md](../../DATA_MODEL.md).  
Tests: [../../TESTING.md](../../TESTING.md).

## Reject

| Option | Why |
|--------|-----|
| Hostinger MySQL | Not the SoR choice |
| Prisma | Less transparent for stock TX style preferred here |
| neon-http stock path | No interactive multi-statement TX |

## Related

- [../RECOMMENDATION.md](../RECOMMENDATION.md)  
- [../../ENV.md](../../ENV.md)  
