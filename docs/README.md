# Perfume Aura — documentation index

Single entry point for product, technical, deploy, and phase docs.  
Code lives in the monorepo; **this folder is the system of record for decisions**.

| Field | Value |
|-------|--------|
| Brand | Perfume Aura |
| Marketing | [perfumeaura.com](https://perfumeaura.com) |
| Ops (planned) | [app.perfumeaura.com](https://app.perfumeaura.com) |
| Repo | https://github.com/MohsinMMK/perfume-aura |
| Stack lock | [stack-research/RECOMMENDATION.md](./stack-research/RECOMMENDATION.md) |
| Last docs pass | 2026-07-22 |

---

## Start here

| If you need… | Read |
|--------------|------|
| What we are building | [PRD.md](./PRD.md) |
| How it is built (stack + rules) | [TRD.md](./TRD.md) |
| System shape (as-built) | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Tables / invariants | [DATA_MODEL.md](./DATA_MODEL.md) |
| Env vars | [ENV.md](./ENV.md) |
| Auth / security checklist | [SECURITY.md](./SECURITY.md) |
| Tests | [TESTING.md](./TESTING.md) |
| Phase roadmap | [ROADMAP.md](./ROADMAP.md) |
| Deploy marketing + ops | [DEPLOY.md](./DEPLOY.md) |
| Ops Node go-live steps | [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md) |
| DNS Path A / support paste | [HOSTINGER_SUPPORT_DNS.md](./HOSTINGER_SUPPORT_DNS.md) |
| Agent rules (repo root) | [../AGENTS.md](../AGENTS.md) |
| Dev quick start | [../README.md](../README.md) · [LOCAL_DEV.md](./LOCAL_DEV.md) |

---

## Product & phases

| Doc | Status |
|-----|--------|
| [PRD.md](./PRD.md) | Approved |
| [PHASE1_STATUS.md](./PHASE1_STATUS.md) | Code + tests done; production Node pending |
| [PHASE2_INVOICING.md](./PHASE2_INVOICING.md) | Design ready |
| [PHASE3_PAYMENTS.md](./PHASE3_PAYMENTS.md) | Design ready |
| [PHASE4_FINANCE.md](./PHASE4_FINANCE.md) | Design ready |
| [ROADMAP.md](./ROADMAP.md) | Living summary |

---

## Engineering

| Doc | Contents |
|-----|----------|
| [TRD.md](./TRD.md) | Locked stack, app structure, security IDs, acceptance |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Deploy topology, request path, packages, inventory TX |
| [DATA_MODEL.md](./DATA_MODEL.md) | Phase 1 schema + Phase 2–4 hooks |
| [ENV.md](./ENV.md) | All environment variables |
| [SECURITY.md](./SECURITY.md) | Owner-only auth, sessions, SEC checklist |
| [TESTING.md](./TESTING.md) | Unit + integration commands and coverage |
| [LOCAL_DEV.md](./LOCAL_DEV.md) | Install, seed, day-to-day commands |
| [GLOSSARY.md](./GLOSSARY.md) | Terms (SKU, paisa, movement, …) |

---

## Hosting & DNS

| Doc | Contents |
|-----|----------|
| [DEPLOY.md](./DEPLOY.md) | Dual Hostinger websites, Git, SSL |
| [OPS_DEPLOY_CHECKLIST.md](./OPS_DEPLOY_CHECKLIST.md) | `app.perfumeaura.com` Node checklist |
| [HOSTINGER_SUPPORT_DNS.md](./HOSTINGER_SUPPORT_DNS.md) | Path A NS + support paste |

**Rules (non-negotiable):**

1. Domain registration stays at **GoDaddy**.  
2. DNS zone edits only at **Hostinger** while NS are `lunar` / `solar`.  
3. Marketing = classic Git → `public_html` (static only).  
4. Ops = **Node.js Web App** (never classic Git for Next).  
5. No Vercel production.  

---

## Stack research (locked)

| Doc | Role |
|-----|------|
| [stack-research/RECOMMENDATION.md](./stack-research/RECOMMENDATION.md) | Final decision table |
| [stack-research/README.md](./stack-research/README.md) | Research index |
| [stack-research/agents/](./stack-research/agents/) | Per-layer agent briefs |

Do **not** re-open stack choices during Phase 1–2 without a written ADR.

---

## Doc maintenance rules

1. Update **PHASE1_STATUS** / **ROADMAP** when a phase ships.  
2. Schema changes → **DATA_MODEL** + **TRD** §4 in the same PR.  
3. New env vars → **ENV.md** + `apps/ops/.env.example`.  
4. Hostinger account facts (order id, IP, CDN) → **OPS_DEPLOY_CHECKLIST** / **HOSTINGER_SUPPORT_DNS**.  
5. Prefer linking over duplicating long checklists.  
