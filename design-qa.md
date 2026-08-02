# Perfume Aura storefront design QA

Date: 2026-08-02

## Fresh reference crawl

- Live source: `https://buckssauce.com` plus `/shop`,
  `/shop/crushed-pineapple-sriracha`, `/about`, `/faq`, `/contact`, and
  `/wholesale`.
- Captures and DOM evidence:
  `/Users/mohsinkhan/.codex/visualizations/2026/08/02/bucks-full-fidelity-audit-2`.
- Source homepage, shop, and product pages were captured from top to footer at
  1280 x 720. Menu-adjacent sticky-header and populated-cart states were also
  inspected. About, FAQ, Contact, and Wholesale were captured at four scroll
  positions each.
- Measured source tokens: body `#100b06`, text `#f5e4c7`, gold `#be8d3f`,
  orange `#f15726`, red `#da1f27`, 10 px card/control radii, dashed hairline
  rules, Inter Tight body copy, and a tightly spaced custom condensed display
  face.

## Implemented fidelity surfaces

- Navigation now uses the source's fixed corner composition. The full desktop
  navigation changes to a compact `Get scent`, cart, and menu control set after
  scroll; mobile uses the same compact state. Drawers retain semantic buttons,
  inert closed content, focus restoration, and 44 px minimum targets.
- The source's palette is now the storefront-wide token system. The previous
  off-black, alternate cream, and different gold values were removed from the
  public experience. Product-specific wine, blue, and rose remain inside the
  owner-approved Perfume Aura imagery.
- Bebas Neue is self-hosted from the Fontsource package as an open-source
  condensed editorial display face. Playfair Display remains the Perfume Aura
  wordmark/accent face and Manrope remains the body face; no source font was
  copied.
- The homepage now follows the source rhythm: cinematic product hero, floating
  image manifesto, stacked proof panels, oversized outline collection title,
  edge-to-edge product stages, long horizontal numbered story sequence,
  image/text conversion split, horizontal editorial cards, and dense grid
  footer.
- Shop, PDP, About, FAQ, Contact, Wholesale, collections, search, policy, cart,
  checkout, account, 404, and footer surfaces now share that system. The PDP's
  first desktop viewport contains the gallery, title, price state, information
  cards, assurances, size, quantity, and CTA. Mobile hides secondary assurance
  blocks so price, size, quantity, and Add to Cart remain in the opening
  viewport.
- Perfume product images were preserved exactly as requested. Cards show the
  plain bottle/color composition by default and reveal the existing cloth,
  water, or petal campaign image plus price, Buy now, and Add to cart on
  hover/focus. Coarse pointers keep actions visible.
- Signature prices, legal claims, shipping terms, reviews, and checkout remain
  fail-closed. The visual match does not invent a public commercial fact.

## Motion and interaction evidence

- GSAP drives hero entrances, bottle changes and float, scroll progress,
  clipped copy reveals, stacked-panel choreography, floating media, image
  parallax, product-card entrances, card hover/focus transitions, the pinned
  horizontal numbered sequence, and the editorial marquee.
- The long numbered sequence was tested at four points across its scroll range.
  An initial P1 blank interval caused by `overflow: hidden` suppressing sticky
  positioning was fixed with horizontal clipping that does not create a sticky
  scroll container.
- Local menu and cart states were opened through their real semantic controls.
  The cart was checked empty and with a 30 ml INR line after a real Add to Cart
  request; quantity controls, subtotal, close control, and cart link remained
  present.
- Current local page and API console inspection contains no application errors.
  The browser log contains development-only HMR/React DevTools messages.
- Reduced-motion CSS removes animation duration, disables smooth scrolling,
  returns the pinned story to a static grid, and leaves all content visible.

## Combined comparison

- Source homepage contact sheet: `home-contact-sheet.png`.
- Final local homepage contact sheet: `corrected-home-contact-sheet.png`.
- Same-input visual comparison: `corrected-home-side-by-side.png`.
- All three files are in
  `/Users/mohsinkhan/.codex/visualizations/2026/08/02/bucks-full-fidelity-audit-2`.
- The paired comparison shows the same near-black canvas, warm cream type,
  fixed corner controls, giant filled/outlined headlines, warm-color product
  blocks, long narrative scroll, split cream conversion panel, horizontal card
  sequence, and dense footer. Remaining differences are Perfume Aura identity,
  imagery, copy, commerce release gates, and accessibility corrections.

## Verification

- `pnpm commerce:verify`
- `pnpm --filter @perfume-aura/storefront typecheck`
- `pnpm --filter @perfume-aura/storefront lint`
- `pnpm --filter @perfume-aura/storefront test`
- `pnpm --filter @perfume-aura/storefront build`
- `pnpm security:audit`
- `pnpm storefront:pack`

The verified extracted artifact is
`dist/perfume-aura-storefront_66d37a950b51-dirty-20260802T081328Z-27240.zip`
with SHA-256
`9f0d6d74f2307af9c3dde01115c112fcad293287d8034a8c11295c94e5c814de`.

## Findings

- No actionable P0, P1, or P2 finding remains in the captured desktop states,
  semantic drawer states, or purchase-control viewport.
- P3: the current in-app browser surface is fixed at 1280 x 720 and exposes no
  viewport resize control. Responsive CSS, coarse-pointer behavior, and the
  previously passing 390 x 844 baseline were preserved, but a fresh physical
  390 x 844 subjective screenshot should be repeated before release approval.
- No deployment, DNS change, provider mutation, or database migration was
  performed.

final result: passed
