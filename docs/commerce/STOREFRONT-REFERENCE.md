# Storefront reference system

Source snapshot: **2026-08-13**. Public websites and build assets can change;
re-capture the reference before a later visual rewrite.

This record makes COM-ADR-026 repeatable. It documents the Bucks Sauce design
system and interaction grammar that Perfume Aura may adapt while keeping its
own name, photography, fragrance copy, routes, data, and accessibility
requirements. It is an implementation reference, not permission to copy
foreign code, media, fonts, branding, claims, analytics, or customer data.

## Source and capture scope

Canonical source: [buckssauce.com](https://buckssauce.com/)

Routes inspected read-only:

- [Home](https://buckssauce.com/)
- [Shop](https://buckssauce.com/shop)
- [Representative product](https://buckssauce.com/shop/crushed-pineapple-sriracha)
- [About](https://buckssauce.com/about)
- [FAQ](https://buckssauce.com/faq)
- [Contact](https://buckssauce.com/contact)
- [Wholesale](https://buckssauce.com/wholesale)

The 2026-08-12 full pass used `1440 × 900` desktop and `390 × 844` mobile
viewports. It inspected the settled header, compact scrolled header, navigation
drawer, cart drawer, homepage, catalog, product, FAQ open state, contact,
wholesale, and about compositions. The 2026-08-13 refresh rechecked the
expanded and compact homepage headers at the same viewports. No product was
added, no checkout was entered, and no form was submitted. Screenshots remain
untracked local QA evidence in the Codex visualization workspace rather than
repository assets.

## Typography and licensing

| Role | Live source | Perfume Aura decision |
|---|---|---|
| Body and UI | `Inter Tight`, variable 100–900, with Arial metric fallback | Use `@fontsource-variable/inter-tight` under SIL OFL 1.1. |
| Display and buttons | `PeperoncinoSansCustom`, regular 400, with Arial metric fallback | Do not copy the live WOFF. The Resistenza family requires appropriate WebFont rights; retain open-licensed Bebas Neue unless a proper license is purchased and reviewed. |

Primary license references:

- [Inter Tight on Google Fonts](https://fonts.google.com/specimen/Inter+Tight)
- [SIL Open Font License 1.1](https://openfontlicense.org/)
- [Peperoncino Sans licensing](https://www.myfonts.com/collections/peperoncino-sans-font-resistenza/)

The live display treatment is uppercase, condensed, about `-0.02em` tracking,
and tightly led. At the captured mobile hero it measured approximately
`52px / 45.76px`; desktop uses fluid clamp tokens and reached approximately
`88.89px / 78.22px` at 1280px. Perfume Aura should match those roles and fluid
proportions without claiming the commercial source font.

## Tokens and geometry

| Token | Value | Adaptation |
|---|---:|---|
| Canvas | `#100b06` | Primary Perfume Aura background |
| Foreground | `#f5e4c7` | Text, light panels, and primary controls |
| Menu | `#322c23` | Secondary dark controls and elevated surfaces |
| Elevated dark | `#272119` | Low-contrast dark panel option |
| Brown | `#593e2c` | Supporting neutral accent |
| Gold | `#be8d3f` | Brass / first editorial theme |
| Orange | `#f15726` | Second editorial theme and progress accent |
| Red | `#da1f27` | Third editorial theme |

Layout grammar:

- 12-column fluid system with `10px` mobile and `20px` desktop gaps.
- `5px` mobile and `10px` desktop outer gutters in the source; Perfume Aura may
  increase the smallest gutter where touch or reading comfort requires it.
- Primary composition change at `1024px`, supported by `640`, `768`, `1280`,
  and `1536px` refinements.
- Predominantly `10px` corner radii, one-pixel dashed cream rules near 30%
  opacity, oversized full-bleed media, and alternating dark/cream panels.
- Large uppercase section titles, tight editorial crops, small uppercase
  metadata, and explicit numbered sequences provide the visual rhythm.
- Interactive targets remain at least `44px`; desktop source inputs measured
  about `77px` high and close controls about `48px` square.

## Information and interaction rhythm

The reusable source pattern is:

1. Immersive product-led hero with manual next/previous controls.
2. Oversized brand statement interrupted by floating product imagery.
3. Short numbered value or guidance rows.
4. Three-up product/editorial cards with accent themes.
5. Pinned desktop narrative that moves horizontally with scroll.
6. Alternating image-led story panel and large closing product edit.
7. Dense footer combining identity, navigation, status/newsletter, and utility
   actions.

Desktop begins with a complete inline navigation. Scrolling condenses it into a
small identity, primary CTA, cart, and menu cluster. The menu becomes an ivory
right-hand panel approximately six columns wide; the cart is a separate ivory
panel. On mobile each becomes an almost full-viewport sheet inset from the
edges. Perfume Aura keeps its existing inert modal primitive, focus trap,
labelled controls, focus restoration, and route-aware menu closing.

The source retains a simplified icon after its full mark leaves. Perfume Aura
adapts that transition to its own supplied assets: the bottle icon lifts and
fades while the `PERFUME AURA` wordmark settles into the compact header. This
owner-selected inversion preserves brand recognition without copying the
source mark or its exact animation.

Catalog cards use a second-image reveal, title movement, arrow transition, and
two actions when the product is purchasable. A locked preview must not expose
disabled commerce theater: it shows one honest `View scent` action instead.

## Motion contract

The inspected source loads GSAP 3.14.2, `@gsap/react`, ScrollTrigger,
SplitText, Draggable, and Lenis 1.3.17. Observed patterns include character and
line reveals, scrubbed parallax, pinned horizontal sections, layered card
reveals, draggable review movement, and a slow two-second yoyo product pulse.

Perfume Aura uses its existing GSAP/ScrollTrigger dependency for scoped reveals,
parallax, a desktop-only pinned journey, and a pausable marquee. Native scrolling
remains the foundation; no Lenis dependency is added because it is not needed
to reproduce the composition and could interfere with accessibility. All
animations must:

- disable cleanly for `prefers-reduced-motion`;
- avoid hiding meaningful content before JavaScript runs;
- clean up only triggers created by their own component;
- pause continuous motion during hover, keyboard focus, or document hiding;
- preserve usable native horizontal scroll-snap on mobile.

## Fidelity and adaptation matrix

| Source pattern | Perfume Aura implementation | Boundary |
|---|---|---|
| Inter Tight body typography | Exact open font package | OFL attribution retained in the package |
| Peperoncino display typography | Bebas Neue substitute with matched role, tracking, and leading | No source WOFF copying without WebFont rights |
| Dark cream/gold/orange/red palette | Exact relationship using Perfume Aura tokens | Perfume Aura imagery and content only |
| Product-led hero and manual slider | Perfume Aura bottle compositions and labelled controls | No automatic carousel or copied fruit/media |
| Compact scrolled header | Supplied full mark transitions to the supplied wordmark beside the route-aware CTA, cart, and menu cluster | Existing release locks remain authoritative |
| Cream menu/cart sheets | Accessible controlled sheets with focus management | Do not copy non-inert closed panels |
| Pinned horizontal narrative | Desktop GSAP journey; mobile native scroll-snap cards | Reduced motion remains complete and readable |
| Hover product reveal | CSS-owned reveal with real routes and honest locked state | No duplicated GSAP hover ownership |
| Newsletter/status footer cell | Clearly non-input status panel until subscription exists | No dead form control or collection claim |

## Defects that must not be copied

- Global outline removal from controls.
- Closed overlays that remain exposed to assistive technology.
- Clickable FAQ `div` elements without button or keyboard semantics.
- Tabs without `aria-expanded` and `aria-controls` relationships.
- Duplicate animated labels that produce repeated accessible names.
- Placeholder-only forms without persistent labels.
- A blocking intro or any animation without a reduced-motion alternative.

Fresh browser evidence outranks this document. If a future implementation
changes the reference relationship, refresh this snapshot and COM-ADR-026 in
the same review.
