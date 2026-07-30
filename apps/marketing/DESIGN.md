---
version: "alpha"
name: Perfume Aura Motion Atelier
description: Cinematic black-and-brass editorial system for the Parfum Elixir collection.
colors:
  primary: "#080808"
  surface: "#10100f"
  graphite: "#171613"
  graphite-soft: "#211e19"
  tertiary: "#c89a48"
  tertiary-deep: "#a97632"
  tertiary-light: "#e1bc72"
  tertiary-pale: "#f0d9a7"
  neutral: "#f5efe4"
  muted: "#b8afa3"
  dim: "#8b837a"
typography:
  hero:
    fontFamily: Playfair Display
    fontSize: 12rem
    fontWeight: 500
    lineHeight: 0.72
    letterSpacing: -0.09em
  h1:
    fontFamily: Playfair Display
    fontSize: 5.2rem
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -0.045em
  h2:
    fontFamily: Playfair Display
    fontSize: 4rem
    fontWeight: 500
    lineHeight: 1
  body:
    fontFamily: Manrope
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: Manrope
    fontSize: 0.72rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.18em
rounded:
  sm: 6px
  md: 16px
  lg: 24px
  xl: 32px
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 64px
components:
  page-shell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
  editorial-card:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  soft-surface:
    backgroundColor: "{colors.graphite-soft}"
    textColor: "{colors.tertiary-pale}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "{spacing.lg}"
  button-light:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "{spacing.lg}"
  footer:
    backgroundColor: "{colors.tertiary-deep}"
    textColor: "{colors.primary}"
    padding: "{spacing.3xl}"
  navigation:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    height: 76px
  metadata:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
  subdued-caption:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.dim}"
    typography: "{typography.label}"
  gold-label:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.tertiary-light}"
    typography: "{typography.label}"
---

# Perfume Aura Marketing Design System

## Overview

Perfume Aura uses cinematic editorial composition to present Parfum Elixir as both fragrance and designed object. Direction follows a framed atelier experience: rounded outer shell, structural grid lines, layered image cards, oversized display type, split editorial panels, format boards, and choreographed reveal motion. Palette remains exclusively Perfume Aura: matte black, graphite, warm brass gold, ivory, and neutral taupe.

Experience must feel immersive without inheriting foreign branding, imagery, analytics, preview controllers, or commerce claims. Motion enhances arrival but never blocks access, survives JavaScript failure, and disappears under reduced-motion preference.

## Colors

| Token | Value | Role |
| --- | --- | --- |
| `ink` | `#080808` | Page background and deepest surfaces |
| `ink-raised` | `#10100f` | Main shell and raised dark panels |
| `graphite` | `#171613` | Cards and editorial frames |
| `graphite-soft` | `#211e19` | Secondary depth |
| `gold` | `#c89a48` | Primary brand accent and calls to action |
| `gold-deep` | `#a97632` | Dark brass gradient stop with accessible dark text |
| `gold-light` | `#e1bc72` | Highlights, focus rings, fine rules |
| `gold-pale` | `#f0d9a7` | Warm text accents |
| `ivory` | `#f5efe4` | Primary text |
| `muted` | `#b8afa3` | Secondary text |
| `dim` | `#8b837a` | Tertiary annotations |

Gold gradients may use only listed gold tokens. Dark gradients may use only listed black/graphite tokens. No green, pastel fashion palette, bright white panels, or unrelated accent colors.

## Typography

- Display: **Playfair Display**, fallback Georgia/serif.
- Interface and body: **Manrope**, fallback system sans-serif.
- Hero display: `clamp(7rem, 25vw, 23rem)`, tightly tracked, used as spatial architecture.
- Section display: `clamp(2.4rem, 5vw, 5.2rem)`.
- Card display: `clamp(2rem, 4vw, 4rem)`.
- Body: minimum `1rem` with `1.6` line height.
- Labels: `0.68–0.75rem`, uppercase, `0.12–0.18em` tracking. Labels supplement readable body text; never carry essential instructions alone.
- Use sentence case for headlines. Avoid generic luxury clichés, excessive all caps, or multiple display faces.

## Layout

- Page sits inside a centered shell up to `96rem`, with responsive outer padding.
- Shell uses a rounded perimeter, fine brass border, deep shadow, and internal sectional rules.
- Opening stage fills most of viewport and includes structural inset frame, vertical guides, midpoint rule, corner markers, oversized wordmark, and layered bottle-card cluster.
- Main editorial area becomes asymmetric two-column composition at desktop and one column on mobile.
- Layered image collages may overlap within bounded containers; important text never overlaps imagery.
- Format board uses compact tabs plus one large selected-format panel.
- Story and house sections alternate copy and imagery to maintain editorial rhythm.
- Mobile preserves hierarchy, hides secondary cluster cards, and avoids horizontal overflow.

## Elevation & Depth

- Use dark tonal layering, brass hairlines, inset top highlights, and broad low-opacity shadows.
- Translucent overlays are allowed only where needed to label imagery or keep navigation readable.
- Backdrop blur is reserved for sticky navigation and image captions; it is not default card styling.
- Bottle cards use perspective and controlled rotation to imply a three-dimensional editorial stack.
- Never use neon glows, colored drop shadows, or excessive glass surfaces.

## Shapes

- Outer shell: responsive `1.35–2rem` radius.
- Editorial cards: `1.5rem` radius.
- Compact panels and tabs: `1–1.25rem` radius.
- Buttons, notes, and release badges: pill shape.
- Structural grid and corner markers remain square and precise.
- Bottle artwork itself remains unmasked where full silhouette matters.

## Components

1. **Intro Curtain** — short noninteractive opening title, progress rule, under 1.8 seconds, removed for reduced motion.
2. **Site Header** — brand pill, desktop navigation, accessible mobile overlay, strong focus handling, and no-JavaScript fallback.
3. **Motion Stage** — inset frame, metadata, oversized AURA title, layered bottle cards, restrained pointer parallax.
4. **Editorial Collage** — central family portrait supported by rotated format crops and a compact orbit note.
5. **Format Tiles** — three image-led cards for 30 ml, 50 ml, and 100 ml.
6. **House Note** — brand philosophy panel; never presented as a fabricated customer review.
7. **Release Panel** — honest launch status without fake ordering, price, stock, or payment claims.
8. **Format Board** — accessible tab controls updating selected image and explanatory copy.
9. **Story Pair** — offset image pair with editorial copy.
10. **House Panel** — bottle-family image, launch context, and simple house statistics.
11. **Footer** — compact navigation and explicit preview status.

## Do's and Don'ts

### Do

- Use only Perfume Aura bottle artwork stored under `apps/marketing/assets/`.
- Preserve cinematic framing, layered cards, editorial asymmetry, and staged motion direction.
- Keep bottle labels legible and object crops intentional.
- Use local optimized WebP files with dimensions and lazy loading below fold.
- Keep all navigation and format controls keyboard accessible.
- Provide no-JavaScript navigation and reduced-motion behavior.
- State clearly that ordering, price, delivery, and payment details are not live yet.
- Keep tap targets at least 44px and body copy at least 16px.

### Don't

- Use Mirelle branding, green/cream palette, fashion copy, foreign images, analytics IDs, or preview scripts.
- Copy Tailwind CDN, duplicate GSAP/Three.js libraries, draggable plugins, or WebGL loops into production.
- Block page access with a long intro sequence.
- Fabricate testimonials, pricing, stock, shipping guarantees, checkout, or newsletter submission.
- Let perspective motion move essential text or controls.
- Depend on hover for access to information.
- introduce colors outside the defined black, graphite, brass, ivory, and neutral palette.
