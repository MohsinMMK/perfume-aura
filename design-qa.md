# Storefront design QA

Historical acceptance record; not current production state or an evergreen
release gate. Read [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) for live
state and
[`docs/commerce/STOREFRONT-REFERENCE.md`](docs/commerce/STOREFRONT-REFERENCE.md)
for the current design/reference contract.

QA date: **2026-08-12**

Implementation source:
[`b1f5c9cf24c9375446052596870e2bfdf534f422`](https://github.com/MohsinMMK/perfume-aura/commit/b1f5c9cf24c9375446052596870e2bfdf534f422)
(PR [#11](https://github.com/MohsinMMK/perfume-aura/pull/11)).

## Compared state

- Reference: `https://buckssauce.com/`, settled home hero.
- Implementation: source commit above, built with every storefront release flag
  closed. Reproduce it with `pnpm build:storefront`, followed by
  `pnpm start:storefront`, and use the loopback URL printed by Next.js.
- Matched viewports: `1440 × 900` and `390 × 844`.
- Stable evidence identifier: `PR-11/2026-08-12-bucks-home-v1`.
- Capture procedure: follow `docs/commerce/STOREFRONT-REFERENCE.md`, capture
  the settled reference and implementation at both matched viewports, then
  compare desktop and mobile pairs. Screenshot pixels remain untracked local
  QA evidence under the documented no-copy boundary.

## Captured result

At the recorded source and date, implementation matched reference's
near-black/cream palette,
condensed uppercase typographic hierarchy, outlined headline treatment,
full/compact header rhythm, dashed metadata rule, product-led slider,
circular controls, light CTA, tight radii, cream navigation/cart sheets, and
desktop/mobile composition. The verified computed typefaces are Inter Tight
Variable for body/UI and Bebas Neue for display; the latter is the documented
open substitute for the reference's commercially licensed display font.

Intentional differences are Perfume Aura identity, original fragrance copy,
Perfume Aura bottle photography, the absence of copied fruit/brand assets, and
accessible dialog/focus/reduced-motion behavior. The mobile hero keeps the CTA
inside the first viewport, menu and cart controls open and close correctly,
menu links close the controlled sheet on navigation, and continuous marquee
motion pauses for hover, focus, and hidden-document states. No browser console
warnings or errors appeared in the final menu/cart pass.

Verification captured on 2026-08-12: `pnpm check`, all 62 tests then reported
by `pnpm test:integration` against a migrated disposable loopback PostgreSQL
database, and `git diff --check`. The disposable database was removed. The
local shell used Node 25.9.0 and therefore emitted the expected engine warning
for the repository's supported Node 24.x range; compilation and every gate
still completed successfully.

Recorded result: **passed**. This result does not substitute for current build,
browser, or production acceptance.
