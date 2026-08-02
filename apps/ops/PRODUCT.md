# Product

## Register

product

## Users

The primary user is the Perfume Aura owner working inside a private operations
tool. The owner needs to maintain products and variants, understand stock
history, issue invoices, record payments, and read simple financial signals
without switching between spreadsheets or disconnected services. Staff access
is a later concern; the current product remains owner-only.

## Product Purpose

Perfume Aura Ops is the owned system of record for inventory, sales documents,
payments, and operational finance. It succeeds when day-to-day work is fast to
enter, hard to corrupt, easy to audit, and consistent across the complete
workflow from a perfume SKU to stock movement, invoice, payment, and margin.

## Brand Personality

Trustworthy, precise, restrained. The interface should feel aligned with
Perfume Aura's dark luxury direction while remaining a familiar, efficient
business tool whose design disappears behind the task.

## Anti-references

- A public ecommerce storefront inside the admin shell.
- Generic, over-decorated SaaS dashboards that prioritize visual novelty over
  operational clarity.
- Bespoke controls, unfamiliar modal-heavy interactions, or inconsistent form
  patterns when a standard shadcn product affordance exists.
- A broad visual redesign that discards the locked base-luma/taupe token system
  or turns inactive states into saturated decoration.

## Design Principles

1. Make operational truth visible: quantities, status, history, and cost basis
   must be explicit and never implied by decoration.
2. Prefer familiar, consistent controls so the owner can stay in the task.
3. Put safeguards at the decision point with clear consequences and recovery.
4. Preserve a restrained Perfume Aura identity while letting hierarchy and
   density serve the workflow.
5. Treat empty, loading, stale-edit, validation, and archived states as first-
   class product states.

## Accessibility & Inclusion

The admin must remain mobile-usable and keyboard-operable, with semantic
controls, visible focus, readable contrast, descriptive validation, and status
that does not depend on color alone. Motion must communicate state and respect
reduced-motion preferences. Dense operational data may remain compact, but
forms and destructive decisions must stay clear at every supported viewport.
