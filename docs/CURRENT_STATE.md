# Current state

Fresh provider, DNS, endpoint and repository evidence outranks this file.
Never infer a live release from Git HEAD. Never record secrets or customer data.

## Live system

| Surface | Owner | Live source |
|---|---|---|
| `perfumeaura.com` | Hostinger Node.js Web App | `3e822a8e3fe389a34652a8e4d6c0cb565533a744` |
| `www.perfumeaura.com` | Path/query-preserving 308 to apex | Same storefront |
| `app.perfumeaura.com` | VPS Caddy → loopback 3020 → Ops | `09164609b918cf8c356ec35e42e6d96ff1a25dce` |
| Private storefront preview | VPS loopback 3030; no public route or secrets | `f329d2b79174fd3bd79ddc96ce9f1620eb8937e4` |

VPS: Hostinger KVM2, public `194.164.149.3`, Tailscale `100.119.191.103`.
Admin: `ssh khanect-vps`. SSH is private; only HTTP/HTTPS are public.
GoDaddy owns registration. Hostinger nameservers `lunar.dns-parking.com` and
`solar.dns-parking.com` own DNS. Apex/www still use Hostinger CDN; app uses
the VPS A record. Do not create `shop` or `www.app`.

Storefront and Ops share Neon with separate restricted roles, auth tables,
secrets and cookies. No database has moved to the VPS. Self-hosted PostgreSQL
preparation under `deploy/postgres-vps/` is not active production.

## Deployment status

- Ops: scoped GitHub Actions → immutable GHCR image → Tailscale forced SSH →
  hardened VPS container → exact public verification.
- Storefront: the public Hostinger runtime works, but Git deployment is not
  accepted. Do not assume a push updates the public storefront.
- VPS storefront implementation is in `deploy/storefront-vps/`; production
  Compose uses loopback 3031, separate runtime secrets and a separate restricted
  deploy identity. The public cutover is **not complete**.
- Root-owned Compose/deploy scripts and the restricted SSH identity are installed;
  probe succeeds and arbitrary commands are denied. GitHub holds the dedicated
  `VPS_STOREFRONT_SSH_KEY`. Both VPS storefront switches remain false until the
  runtime environment is securely transferred and verified. Hostinger source
  promotion is disabled, preserving the working public runtime without new builds.
- The private preview passes exact version, homepage, real static asset, locked
  cart/auth and www redirect checks. It is not production-environment acceptance.
- Markdown-only changes must not deploy. Storefront-only releases must not
  deploy Ops or apply migrations. Database changes fail closed at the owner gate.

## Active release locks

All remain false: `STOREFRONT_PUBLIC_RELEASE`, `STOREFRONT_PREVIEW_CATALOG`,
`STOREFRONT_CUSTOMER_AUTH_ENABLED`, `STOREFRONT_CHECKOUT_RELEASE_APPROVED`,
`STOREFRONT_INQUIRIES_ENABLED`, `STOREFRONT_COMMERCE_MAINTENANCE_ENABLED`,
`OPS_TWO_FACTOR_REQUIRED`, and `OPS_STAFF_INVITES_ENABLED`.
Database checkout must also remain disabled.

Visitors see 114 discovery products (79 Inspired, 15 Unknown, 20 Signature),
322 owner-priced variants. WhatsApp is the order/contact path. This is not
approved sellable catalog publication. Shop/products stay noindex; checkout
is unavailable. Customer auth returns 404 before initializing auth/Neon.

Production migration `0017_storefront_sale_settlement` is not applied. The
`0016` apply is unrecorded: check the journal before related work.
Do not deploy Ops from main until its manual migration/grant gate passes.
Storefront-only releases may proceed with Ops/database work excluded.

## Cleanup boundaries

Hostinger has five Web App slots occupied. Perfume Aura removal candidates:
the storefront after accepted VPS cutover, the off-DNS Ops Web App, and
`royalblue-dugong-614889.hostingersite.com` (auto-deployment off).
Keep `mobitron.in`, `khanect.com`, email and the DNS zone.

VPS has 15 running containers: Ops (1), storefront preview (1), Awwal (3),
Awwal Cloud (2), Omni Realty (6), infrastructure (2). Preserve unrelated
projects, volumes and images. No capacity need justifies deleting them.
Preview removal follows production acceptance.

Keep `dist/`, credentials, catalog source evidence, migrations and accepted
recovery artifacts. Remove the Hostinger source branch and obsolete deployment
credentials only after provider disconnection and VPS acceptance.

## Next actions

1. **Owner input required:** open the storefront Environment variables page in
   hPanel or provide its secure export through the approved secret store, not chat.
   Navigation is not working in this session and MCP has no export capability.
   Hostinger's official API returns masked values, not recoverable secrets.
   Transfer to root-owned `/etc/khanect/perfume-aura-storefront.env`; never reuse
   Ops credentials or delete the existing env before preserving it.
2. Complete protected GitHub CI and immutable registry pull acceptance, then
   enable storefront VPS deployment only after the runtime prerequisites pass.
3. Verify privately, validate/reload scoped Caddy, change only apex/www web
   records, and pass full public acceptance.
4. Remove the three obsolete Perfume Aura Web Apps preserving email/DNS,
   disconnect retired Git triggers, remove the preview, and verify again.
5. Keep commerce/security gates closed. Owner gates: India counsel, catalog
   facts/media, CA/tax/delivery policies, Google/SMTP/Cashfree, owner TOTP/staff
   denial, telemetry/maintenance, and explicit launch approval.

## Find the owner

- [Operations](OPERATIONS.md): deployment, provider changes, recovery and acceptance.
- [Engineering](ENGINEERING.md): code navigation, Graphify, tests and invariants.
- [Commerce](COMMERCE.md): product behavior, business requirements and launch gates.
- [Reference](REFERENCE.md): catalog evidence and design constraints.
