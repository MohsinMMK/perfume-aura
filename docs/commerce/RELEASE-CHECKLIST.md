# Commerce release checklist

No item is complete until supported by current evidence in `VERIFICATION.md`. A green build alone is not a deployment, payment proof, inventory proof, or customer-journey proof.

## Scope and decisions

- [ ] Launch catalog and featured products approved
- [ ] Public names and reference-fragrance policy legally reviewed
- [ ] India-counsel evidence recorded naming every intended surface reviewed (at minimum: public title, PDP copy, URL/slug, metadata/SEO, search/ads/social, bottle label, outer packaging, invoices/customer messages) with exact wording approved per surface; generic legal signoff is insufficient (TRUST-001)
- [ ] Bottle-label and packaging reference policy remains disabled unless separate owner and India-counsel surface approval exists and is recorded for those surfaces (COM-ADR-022)
- [ ] Disclaimer wording and placement approved for each intended surface; disclaimer is not treated as safe harbor
- [ ] Sizes, prices, SKUs, and stock policy approved
- [ ] Delivery regions, fees, estimates, and provider approved
- [ ] Return, cancellation, refund, privacy, and terms text approved
- [ ] Payment methods and reconciliation procedure approved
- [ ] Customer support owner and channels approved
- [ ] Known residual risks accepted by owner

## Catalog and content

- [ ] Every published product passes required catalog validation
- [ ] No `needs_review` row is public
- [ ] Product and variant status agree with storefront visibility
- [ ] Prices use integer paisa internally despite legacy `*Cents` field names and render correctly
- [ ] Availability comes from server-authoritative inventory policy
- [ ] Product images, labels, and alternative text match selected product
- [ ] Notes, ingredients, concentration, longevity, and occasion claims are approved
- [ ] No copied designer asset, description, logo, or misleading affiliation claim
- [ ] No empty public collection or dead finder/search route

## Functional journey

- [ ] Home, shop, collection, search, finder if enabled, and PDP work
- [ ] Size and quantity errors are accessible and block invalid adds
- [ ] Cart persists and revalidates price, availability, and quantity
- [ ] Empty cart has useful, truthful recovery links
- [ ] Guest checkout works without owner authentication
- [ ] Address and delivery validation work
- [ ] Order confirmation is non-enumerable and shows correct snapshot
- [ ] Owner can locate and operate resulting order safely
- [ ] Email/SMS messages, if enabled, match order and policy truth

## Inventory and finance

- [ ] Concurrent reservation cannot oversell
- [ ] Expired, cancelled, and failed reservations release exactly once
- [ ] Confirmed sale creates correct auditable stock movement
- [ ] Order item snapshots remain stable after catalog changes
- [ ] Order-to-invoice transition is idempotent
- [ ] Totals, discounts, delivery, tax if applicable, paid, due, and refunds reconcile
- [ ] Zero-drift reconciliation passes before and after release smoke

## Payments

- [ ] Browser cannot mark order paid
- [ ] Callback/webhook authenticity verified
- [ ] Amount, currency, order, and provider reference matched server-side
- [ ] Duplicate and reordered callbacks are idempotent
- [ ] Pending, failed, cancelled, paid, and refunded paths tested as supported
- [ ] Sandbox success and failure evidence recorded
- [ ] Production credentials exist only in approved provider/runtime secret stores
- [ ] Refund and manual reconciliation runbook tested

## Security and privacy

- [ ] Owner and customer authorization boundaries tested
- [ ] Public sign-up behavior matches accepted decision
- [ ] CSRF/origin and cookie controls verified
- [ ] Rate limiting verified for real client identity or documented safe fallback
- [ ] No secret or private customer data in repo, logs, analytics, artifacts, or docs
- [ ] Dependency/security audits pass at required severity
- [ ] Data retention and deletion responsibilities approved

## Accessibility and performance

- [ ] Keyboard-only journey passes from home through confirmation
- [ ] Focus order, focus restoration, dialogs, errors, and live status pass
- [ ] Screen-reader names and relationships pass
- [ ] Contrast and reduced-motion behavior pass
- [ ] Mobile layouts have no horizontal overflow or covered actions
- [ ] Image sizes and lazy/eager loading match purpose
- [ ] Performance budgets pass on representative mobile profile
- [ ] Third-party scripts have owner, purpose, consent behavior, and measured cost
- [ ] No actionable console, page, or network errors

## SEO and machine-readable data

- [ ] Canonical and robots behavior approved per route
- [ ] Sitemap contains only canonical public routes
- [ ] Product structured data matches visible name, image, price, currency, and availability
- [ ] Open Graph assets use HTTPS and match product
- [ ] Search and agent-facing data expose no private fields

## Build and deployment

- [ ] Exact Node, package-manager, lockfile, and build inputs recorded
- [ ] Full verification command passes on clean checkout
- [ ] Artifact checksum and source commit recorded
- [ ] Artifact contains no environment or owner/customer secret
- [ ] Hostinger Node settings and entry file verified
- [ ] Database migrations and runtime grants verified in approved order
- [ ] Previous production-known-good artifact retained
- [ ] Rollback steps and operator access confirmed before cutover

## Live smoke

- [ ] TLS and DNS target expected deployment
- [ ] Home, catalog, representative PDP, and real static asset return expected status
- [ ] Cart-safe smoke passes without placing an unintended order
- [ ] Payment health/sandbox route if applicable reports expected state without secrets
- [ ] Auth/session and health routes do not return unexpected `500`
- [ ] Authenticated owner product, inventory, order, invoice, and finance pages render
- [ ] One explicitly authorized end-to-end transaction reconciles order, payment/COD, stock, invoice, and confirmation
- [ ] Monitoring and support contacts active

## Post-release

- [ ] Reconciliation repeated after authorized smoke
- [ ] Logs checked for auth, payment, order, inventory, and server errors
- [ ] Failed requests and third-party errors reviewed
- [ ] Release evidence completed in `VERIFICATION.md`
> Optional: regenerate local Graphify analysis when useful. It is not release
> evidence, is not committed, and never blocks checklist completion.
- [ ] Roadmap and owning current docs updated
- [ ] Rollback decision window closed explicitly
