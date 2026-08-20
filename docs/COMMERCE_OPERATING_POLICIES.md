# Commerce operating-policy register

This register is locked fail-closed. Empty evidence means the related public
claim, inquiry channel, catalog publication, delivery route, or checkout gate
must remain disabled. Record references only; never paste credentials,
customer data, private provider payloads, or legal advice into this file.

The dated approval templates are
[`2026-08-20-india-counsel-commerce-review.md`](review-packets/2026-08-20-india-counsel-commerce-review.md)
and [`2026-08-20-ca-gst-commerce-review.md`](review-packets/2026-08-20-ca-gst-commerce-review.md).
They are requests for professional review, not approvals.

## Versioned customer inquiry consent

| Field | Locked value |
|---|---|
| Consent version | Pending owner privacy approval |
| Purpose | Respond to the submitted contact or wholesale inquiry only |
| Required public link | `/privacy` |
| Notification recipient | Pending approved Hostinger mailbox |
| Retention and deletion owner | Pending |
| Response-time claim | Disabled until staffing and evidence are approved |

`STOREFRONT_INQUIRY_CONSENT_VERSION` must match the approved version recorded
here before `STOREFRONT_INQUIRIES_ENABLED` may become true. IP-derived abuse
controls remain disabled until Hostinger proves the configured header cannot be
client-spoofed.

## Catalog publication evidence

The import templates under `data/catalog/templates/` are intentionally empty.
Every populated row requires an owner-reviewed evidence reference. A product
may not advance to `approved` or `published` unless:

- its public identity, copy, legal treatment, and media each have a recorded
  approval reference;
- every active variant has an approved INR-paise price reference;
- each imported media row has an approved asset reference and accessible alt
  text;
- SKU, cost, reorder level, size, and reviewed opening stock are supplied by
  the owner;
- opening stock is received once through the importer's append-only,
  idempotent `receive` stock movement; every later change uses the normal
  audited inventory workflow.

Inspired references remain disabled on bottle labels and outer packaging
unless the separate surface approvals in `docs/COMMERCE.md` are complete.

## Delivery and support policy evidence

| Decision | Evidence reference | State |
|---|---|---|
| Delhivery commercial account and serviceability source | Pending | Locked |
| India Post serviceability source and operating process | Pending | Locked |
| PIN-code delivery estimates | Pending | Locked |
| Flat shipping fee and free-shipping threshold | Pending | Locked |
| Tax treatment | Pending | Locked |
| Returns policy | Pending | Locked |
| Cancellation policy | Pending | Locked |
| Refund support ownership | Pending | Locked |
| Customer support mailbox and staffing | Pending | Locked |
| Wholesale minimums, territories, terms, and response ownership | Pending | Locked |

The owner UI stores approved PIN codes and evidence-backed commerce settings.
Deactivation replaces deletion so prior operating decisions remain auditable.

## Deterministic catalog intake

Run the planner first:

```bash
CATALOG_MANIFEST_SIGNING_SECRET='<owner-held-32+-character-secret>' \
  pnpm catalog:import -- --dry-run
```

It validates and hashes the four review templates without connecting to a
database. Applying reviewed rows requires an owner/direct database connection
and an exact confirmation phrase:

```bash
CONFIRM_CATALOG_IMPORT=APPLY_REVIEWED_CATALOG \
  CONFIRM_CATALOG_DIGEST='<reviewed-digest>' \
  CONFIRM_CATALOG_SIGNATURE='<reviewed-signature>' \
  CATALOG_MANIFEST_SIGNING_SECRET='<same-owner-held-secret>' \
  DATABASE_URL_DIRECT='<owner-direct-url>' \
  pnpm catalog:import -- --apply
```

If any row requests immediate `published` status, the separate
`CONFIRM_CATALOG_PUBLICATION=ALLOW_REVIEWED_PUBLICATION` confirmation is also
required. The importer applies opening balances only once through an
idempotent stock movement and otherwise never adjusts stock, release flags,
checkout settings, or provider configuration.
