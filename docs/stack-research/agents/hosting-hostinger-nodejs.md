# Agent brief — Hostinger Node.js Web App

| Field | Value |
|-------|--------|
| Verdict | Recommend (locked for ops) |
| Score | 5/5 for ops host |
| Docs | https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/ |
| Domain | `app.perfumeaura.com` |

## Fit

Business plan supports Next.js Web Apps. Separate website for ops. Build under Hostinger Node runtime; env vars + restart in hPanel.

## Not for

- Classic Git → `public_html` (static/PHP only)  
- Website Builder / Horizons  
- Marketing Next app (marketing is static)  

## Marketing contrast

| Surface | Product |
|---------|---------|
| perfumeaura.com | Classic Git → `public_html` |
| app.perfumeaura.com | Node.js Web App |

## Risks

- Monorepo workspace install under-documented — use root `pnpm --filter` fallbacks  
- One GitHub integration per plan constraints  
- DNS `app` record only after website exists  

## Account anchors (this project)

| Field | Value |
|-------|--------|
| Order | `1008392140` |
| User | `u602723373` |
| Marketing site | addon `perfumeaura.com` |

## Related

- [../../OPS_DEPLOY_CHECKLIST.md](../../OPS_DEPLOY_CHECKLIST.md)  
- [../../DEPLOY.md](../../DEPLOY.md)  
- [../../HOSTINGER_SUPPORT_DNS.md](../../HOSTINGER_SUPPORT_DNS.md)  
