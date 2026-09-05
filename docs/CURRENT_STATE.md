# Current state

Fresh provider, DNS, endpoint and repository evidence outranks this file.
Never infer a live release from Git HEAD. Never record secrets or customer data.

## Live system

| Surface | Owner | Live source |
|---|---|---|
| `perfumeaura.com` | VPS Caddy → loopback 3031 → storefront | `f3cc5b9e6b5a38e3e4ec26011cf2b84b9b2ce350` |
| `www.perfumeaura.com` | Caddy HTTPS 308 to apex, preserving path/query | Same storefront |
| `app.perfumeaura.com` | VPS Caddy → loopback 3020 → Ops | `09164609b918cf8c356ec35e42e6d96ff1a25dce` |

VPS: Hostinger KVM2, public `194.164.149.3`, Tailscale `100.119.191.103`.
Admin: `ssh khanect-vps`. SSH is private; only HTTP/HTTPS are public.
GoDaddy owns registration. Hostinger nameservers `lunar.dns-parking.com` and
`solar.dns-parking.com` own DNS. Apex and app A records point to the VPS;
www CNAME points to apex. No apex AAAA remains. Hostinger CDN is disabled
and the storefront is opted out of automatic CDN. Preserve mail records.
Do not create `shop` or `www.app`.

Storefront and Ops share Neon and currently use the same runtime database
role/credential; role isolation is not verified. Auth tables, application auth
secrets and cookies remain separate. No database has moved to the VPS. Self-hosted PostgreSQL
preparation under `deploy/postgres-vps/` is not active production.

## Deployment status

- Storefront: protected main → scoped checks → checksummed Linux standalone →
  immutable GHCR image → Tailscale forced SSH → hardened container.
  `VPS_STOREFRONT_AUTO_DEPLOY_ENABLED=true`. GitHub run `33953802523`
  successfully deployed the exact live source. Full public acceptance passes;
  `VPS_STOREFRONT_PUBLIC_VERIFICATION_ENABLED=true` checks future releases.
- Ops uses an independent image and deploy identity. Its accepted runtime source
  is unchanged. `VPS_OPS_AUTO_DEPLOY_ENABLED=false` enforces the pending migration
  gate; the working Ops runtime remains available.
- Storefront image digest:
  `sha256:49c27f3e1b2d54eac64c723fb561036b90850673af1a60eeed0a1529d26d014b`.
  The 12 preserved settings are root-owned mode 0600 in
  `/etc/khanect/perfume-aura-storefront.env`; app auth secrets remain separate.
  Forced SSH probe succeeds and arbitrary commands are denied.
- Private and public acceptance pass: seven discovery URLs, exact source, real
  static asset, locked commerce and www redirect. Browser checks confirm all
  114 discovery scents and disabled purchasing. Ops acceptance also passes.
- Markdown-only changes must not deploy. Storefront-only releases must not
  deploy Ops or apply migrations. Database changes fail closed at the owner gate.

## Active release locks

All remain false: `STOREFRONT_PUBLIC_RELEASE`,
`STOREFRONT_CUSTOMER_AUTH_ENABLED`, `STOREFRONT_CHECKOUT_RELEASE_APPROVED`,
`STOREFRONT_INQUIRIES_ENABLED`, `STOREFRONT_COMMERCE_MAINTENANCE_ENABLED`,
`OPS_TWO_FACTOR_REQUIRED`, and `OPS_STAFF_INVITES_ENABLED`.
Database checkout must also remain disabled.

Production Compose explicitly keeps `STOREFRONT_PREVIEW_CATALOG=false` along
with the other storefront release locks; discovery catalog acceptance passes.

Visitors see 114 discovery products (79 Inspired, 15 Unknown, 20 Signature),
322 owner-priced variants. WhatsApp is the order/contact path. This is not
approved sellable catalog publication. Shop/products stay noindex; checkout
is unavailable. Customer auth returns 404 before initializing auth/Neon.

Production migration `0017_storefront_sale_settlement` is not applied. The
`0016` apply is unrecorded: check the journal before related work.
Do not deploy Ops from main until its manual migration/grant gate passes.
Storefront-only releases may proceed with Ops/database work excluded.

## Credential state

Both root-owned application env files use the rotated shared database credential.
Fresh direct and pooled connections reject its predecessor. Storefront auth and
maintenance secrets are independently generated; customer accounts/sessions are
empty and auth remains disabled. Matching ignored local runtime URLs are synced;
the separate owner connection and Ops auth secret are unchanged.

Both apps pass public acceptance on their accepted images, with schema, grants
and release locks unchanged. The shared role has no superuser, role creation,
database creation, BYPASSRLS or membership in the PostgreSQL `neon_superuser` role.
Neon account/project administration is separate and was not audited. Complete
least-privilege grants and role separation remain reviewed follow-ups.
GitHub has no maintenance secret configured and its maintenance enablement is
unset, so scheduled workers remain inactive. Do not reuse retired hosting envs
for recovery: their credentials are stale; current VPS envs own recovery.

## Cleanup boundaries

Repository working policy: one primary checkout on `main`, no retained feature
or deployment branches and no extra worktrees. Integrate useful changes through
protected PRs, then remove their branches. GitHub deploys accepted images to the
VPS; no workflow creates or advances a Hostinger source branch.

Hostinger has five Web App slots occupied. Pending removal after DNS cache
expiry and explicit irreversible-deletion confirmation: `perfumeaura.com`,
the off-DNS `app.perfumeaura.com` Web App, and
`royalblue-dugong-614889.hostingersite.com` (auto-deployment off).
Keep `mobitron.in`, `khanect.com`, email and the DNS zone.

VPS has 15 running containers: Ops (1), storefront (1), Awwal (3),
Awwal Cloud (2), Omni Realty (6), infrastructure (2). Preserve unrelated
projects, volumes and images. No capacity need justifies deleting them.
No private preview container/network remains. Its image and Compose template
are retained as recoverable, inactive build evidence.

Keep `dist/`, credentials, catalog source evidence, migrations and accepted
recovery artifacts. Retired Hostinger Web Apps are off the public routing path;
their remaining provider Git connections/unused credentials belong to site cleanup,
not to the current VPS release flow.

## Next actions

1. Verify apex/www resolve only to the VPS, with no retired A/AAAA targets,
   before removing recovery hosting.
2. Confirm and remove the three obsolete Perfume Aura Web Apps preserving
   email/DNS; disconnect retired provider Git triggers and remove their unused
   credentials, then verify live routing and hosting slot counts again.
3. Keep commerce/security gates closed. Owner gates: India counsel, catalog
   facts/media, CA/tax/delivery policies, Google/SMTP/Cashfree, owner TOTP/staff
   denial, telemetry/maintenance, and explicit launch approval.

## Find the owner

- [Operations](OPERATIONS.md): deployment, provider changes, recovery and acceptance.
- [Engineering](ENGINEERING.md): code navigation, Graphify, tests and invariants.
- [Commerce](COMMERCE.md): product behavior, business requirements and launch gates.
- [Reference](REFERENCE.md): catalog evidence and design constraints.
