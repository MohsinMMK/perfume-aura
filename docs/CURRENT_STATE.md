# Current state

Fresh provider, DNS, endpoint and repository evidence outranks this file.
Never infer a live release from Git HEAD. Never record secrets or customer data.

## Live system

| Surface | Owner | Live source |
|---|---|---|
| `perfumeaura.com` | VPS Caddy → loopback 3031 → storefront | `2af78e0fd3f14ad199e7ad37e7505e95c706f9f8` |
| `www.perfumeaura.com` | Caddy HTTPS 308 to apex, preserving path/query | Same storefront |
| `app.perfumeaura.com` | VPS Caddy → loopback 3020 → Ops | `2af78e0fd3f14ad199e7ad37e7505e95c706f9f8` |

VPS: Hostinger KVM2, public `194.164.149.3`, Tailscale `100.119.191.103`.
Admin: `ssh khanect-vps`. SSH is private; only HTTP/HTTPS are public.
GoDaddy owns registration. Hostinger nameservers `lunar.dns-parking.com` and
`solar.dns-parking.com` own DNS. Apex and app A records point to the VPS;
www CNAME points to apex. No apex AAAA remains. Hostinger CDN is disabled
and the storefront is opted out of automatic CDN. Preserve mail records.
Do not create `shop` or `www.app`.

Both apps use the self-hosted VPS PostgreSQL; Neon is no longer used by any
runtime. The Neon project still exists unused; it was not copied (quota-locked),
so production started from a fresh schema: migrations `0000`–`0019` applied and
recorded, the `MAIN` location seeded and one Ops owner seeded; no products or
customers yet.

PostgreSQL 18.6 from `deploy/postgres-vps/` listens on loopback
`127.0.0.1:55442` (55432 belongs to another project); pgAdmin is on loopback
5050. Each app reaches it only through its own PgBouncer
(`postgres-pooler:6432`, no host port) on its existing Docker network, with
distinct roles `ops_runtime`, `storefront_runtime` and
`storefront_payment_finalizer`; the bootstrap verified their grants. Its
root-owned checkout is `/srv/perfume-aura`, settings and secrets are in
`/etc/perfume-aura-postgres/`, and the trusted Node is
`/opt/perfume-aura-node/bin/node`. pgBackRest keeps encrypted backups in the
`perfume-aura-pgbackrest-repo` volume; a full backup after cutover, WAL
archiving with `failed_count = 0`, an isolated restore drill and the backup
timers pass. These backups do not survive loss of the VPS; a free second copy
outside it is still open.

## Deployment status

- Storefront: protected main → scoped checks → checksummed Linux standalone →
  immutable GHCR image → Tailscale forced SSH → hardened container.
  `VPS_STOREFRONT_AUTO_DEPLOY_ENABLED=true`. GitHub push run `40091178477`
  deployed the exact live source to both apps. Full public
  acceptance passes; `VPS_STOREFRONT_PUBLIC_VERIFICATION_ENABLED=true` checks
  future releases.
- Ops uses an independent image and deploy identity.
  `VPS_OPS_AUTO_DEPLOY_ENABLED=true`. Ops acceptance (live, ready, version,
  unauthenticated session) and storefront checks pass. Ops sends
  `X-Robots-Tag: noindex, nofollow` on every page.
- Storefront image digest:
  `sha256:c8e50b311901a03471f7926e91bef12bb9eca3f528057cc56cba437ebeb8af76`.
  The runtime settings are root-owned mode 0600 in
  `/etc/khanect/perfume-aura-storefront.env`; app auth secrets remain separate.
  Forced SSH probe succeeds and arbitrary commands are denied.
- Private and public acceptance pass: seven discovery URLs, exact source, real
  static asset, locked commerce and www redirect. Browser checks confirm all
  114 discovery scents and disabled purchasing. Ops acceptance also passes.
- The homepage hero cycles only through Inspired Series and Signature Series.
  The cream guide section is removed; the two featured cards are centered on
  desktop. Desktop/tablet/mobile browser checks pass.
- Markdown-only changes must not deploy. Storefront-only releases must not
  deploy Ops or apply migrations. Database changes fail closed at the owner gate.
- Source pin is Node `26.12.1` / npm `11.20.0` / pnpm `12.15.0` on
  `node:26.12.1-trixie-slim@sha256:36793bcbb160a6a16cede1e62b93f84e26b78a972a8a4c0b879c1c12f22761ec`.
  Both live apps are built on this pin.

## Active release locks

Source dependencies are at latest: Next.js `16.4.3`, React `19.3.1`, Better
Auth `1.7.12`, ESLint `10`, Sentry `11.8.0`, Sharp `0.35.5`, Nodemailer `10.2.1`
and reviewed transitive overrides. The full `pnpm check` (including both audits)
and 113 disposable-database integration tests pass. CI integration stays on
PostgreSQL `16.15` to match the protected `postgresql-16-integration` check;
production now runs 18.6, so moving CI to 18 is an open follow-up.

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
is unavailable. Customer auth returns 404 before initializing auth/database.

Future migrations stay manual until the automated database release is installed
and enabled; `block-runtime-deploy-on-database-migration` stops runtime deploys
of migration changes meanwhile.

## Credential state

Both root-owned application env files point only at their VPS poolers with
their own roles; the pre-cutover copies (`*.pre-vps-postgres-*`, root:root 0600)
still hold the retired Neon URLs and should be removed after acceptance. Storefront
auth and maintenance secrets are independently generated; customer accounts and
sessions are empty and auth remains disabled. Ignored local env files may still
reference Neon; local work must use disposable loopback PostgreSQL. The owner
created the single Ops owner account with the VPS seed helper (see Operations).
GitHub has no maintenance secret configured and its maintenance enablement is
unset, so scheduled workers remain inactive. Do not reuse retired hosting envs
for recovery: their credentials are stale; current VPS envs own recovery.

Google OAuth project `perfume-aura-signin` has the `Perfume Aura Storefront`
web client for apex origin and `/api/customer-auth/callback/google`. Google
remains in testing mode. Its client ID/secret are staged in the ignored local
storefront env and root-owned VPS storefront env; the running container has not
been recreated to load them. SMTP host/user/password/from are absent from that
VPS env. Customer auth stays disabled pending provider testing, email delivery,
privacy/deletion acceptance and the existing activation gates.

## Cleanup boundaries

Repository working policy: one primary checkout on `main`, no retained feature
or deployment branches and no extra worktrees. No third-party review bots
(CodeRabbit and the ChatGPT Codex connector were uninstalled); GitHub Actions
and CodeQL own PR checks. Integrate useful changes through
protected PRs, then remove their branches. GitHub deploys accepted images to the
VPS; no workflow creates or advances a Hostinger source branch.

The retired storefront Web App still displays failed Git builds against
`hostinger-storefront-production`. That deleted branch is not part of the
current GitHub-to-VPS deployment path.

Hostinger has five Web App slots occupied. Pending removal after DNS cache
expiry and explicit irreversible-deletion confirmation: `perfumeaura.com`,
the off-DNS `app.perfumeaura.com` Web App, and
`royalblue-dugong-614889.hostingersite.com` (auto-deployment off).
Keep `mobitron.in`, `khanect.com`, email and the DNS zone.

VPS runs Ops (1), storefront (1), Perfume Aura PostgreSQL (2), Omni Realty
(6), Khanect Kawave PostgreSQL (1) and infrastructure (2); the Awwal stacks are
no longer present. Preserve unrelated
projects, volumes and images. No capacity need justifies deleting them.
No private preview container/network remains. Its image and Compose template
are retained as recoverable, inactive build evidence.

Keep `dist/`, credentials, catalog source evidence, migrations and accepted
recovery artifacts. Retired Hostinger Web Apps are off the public routing path;
their remaining provider Git connections/unused credentials belong to site cleanup,
not to the current VPS release flow.

## Next actions

1. Owner: sign in to Ops and enroll TOTP. Remove the `*.pre-vps-postgres-*` env
   copies. Optionally delete the unused
   Neon project. Make a free backup copy and the pgBackRest cipher passphrase
   available outside the VPS.
2. Verify apex/www resolve only to the VPS, with no retired A/AAAA targets,
   before removing recovery hosting.
3. Confirm and remove the three obsolete Perfume Aura Web Apps preserving
   email/DNS; disconnect retired provider Git triggers and remove their unused
   credentials, then verify live routing and hosting slot counts again.
4. Autonomous main releases: `database-release` (migrate → Ops → storefront) is
   built but disabled. Roles and history are ready; it still needs the VPS admin
   install and `VPS_DATABASE_AUTO_RELEASE_ENABLED`; see Operations.
5. Keep commerce/security gates closed. Owner gates: India counsel, catalog
   facts/media, CA/tax/delivery policies, Google/SMTP/Cashfree, owner TOTP/staff
   denial, telemetry/maintenance, and explicit launch approval.

## Find the owner

- [Operations](OPERATIONS.md): deployment, provider changes, recovery and acceptance.
- [Engineering](ENGINEERING.md): code navigation, Graphify, tests and invariants.
- [Commerce](COMMERCE.md): product behavior, business requirements and launch gates.
- [Reference](REFERENCE.md): catalog evidence and design constraints.
