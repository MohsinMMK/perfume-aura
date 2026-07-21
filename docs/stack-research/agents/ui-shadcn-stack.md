# Agent brief — shadcn base UI (official CLI only)

| Field | Value |
|-------|--------|
| Verdict | Recommend (locked) |
| Score | 5/5 |
| Docs | https://ui.shadcn.com/docs · monorepo · installation/next |
| Preset | **`b23PPibQOI`** (must resolve with no fallbacks) |
| Updated | 2026-07-22 |

## Policy (STRICT)

This monorepo uses the **official shadcn CLI** for all UI primitives. Hand-copied components are **not** the install path.

## Layout

| Path | Role |
|------|------|
| `packages/ui` | Shared shadcn components (`@perfume-aura/ui`) |
| `packages/ui/components.json` | Package aliases |
| `apps/ops/components.json` | App aliases → package |
| `apps/ops/components/*` | App-only compositions (not registry primitives) |

## Official commands

```bash
# From monorepo root — add to packages/ui via apps/ops config
pnpm dlx shadcn@latest add button -c apps/ops -y

# Preview path (must show packages/ui/…)
pnpm dlx shadcn@latest add button -c apps/ops --dry-run -y

# Overwrite existing registry component
pnpm dlx shadcn@latest add button -c apps/ops -y -o

# Verify locked preset (must be b23PPibQOI, no fallbacks)
pnpm dlx shadcn@latest preset resolve -c apps/ops
```

**CSS path:** `apps/ops/components.json` → `../../packages/ui/src/globals.css`  
Do not reintroduce duplicate theme tokens in `apps/ops/app/globals.css`.

## Locked companions (via CLI / official guides)

- Style: **base-luma** (Base UI) · preset **`b23PPibQOI`**
- baseColor: **taupe** · theme/chart: **taupe** · radius: **small**
- Icons: **hugeicons** (`@hugeicons/react`, `@hugeicons/core-free-icons`)
- Fonts: **IBM Plex Sans** + **Raleway** (heading) in `apps/ops/app/layout.tsx`
- Tailwind **v4** · **sonner**
- CSS source of truth: `packages/ui/src/globals.css` (ops `components.json` must point here for `preset resolve`)
- Forms: Field / FieldGroup (official forms skill) when needed
- Tables: TanStack Table + official data-table guide when needed

## Import pattern

```tsx
import { Button } from "@perfume-aura/ui/components/button"
import { cn } from "@perfume-aura/ui/lib/utils"
import {
  Sidebar, SidebarProvider, SidebarInset, SidebarMenuButton,
} from "@perfume-aura/ui/components/sidebar"
import { Empty, EmptyHeader, EmptyTitle } from "@perfume-aura/ui/components/empty"
```

**App shell (official):** `SidebarProvider` + `AppSidebar` + `SidebarInset` + `SidebarTrigger`  
(see `apps/ops/components/app-shell.tsx`, pattern from `@shadcn/sidebar-01`).

**Empty states (official):** use `Empty` / `EmptyHeader` / `EmptyTitle` / `EmptyDescription`  
(not custom dashed cards).

## Forbidden

- Hand-pasting registry source as the primary way to “install” shadcn
- Putting registry components only in `apps/ops/components/ui` while monorepo package exists
- Skipping CLI because a file already exists (use `-o` or `diff`)
- Bulk-adding unused registry components “for later” — add only what the app imports and uses

## As-built components (Phase 1)

Installed under `packages/ui/src/components/` when needed: badge, button, card, dialog, empty, field, input, label, native-select, separator, sheet, sidebar, skeleton, sonner, spinner, table, textarea, tooltip.

## Related

- [../../ARCHITECTURE.md](../../ARCHITECTURE.md)  
- [../../../AGENTS.md](../../../AGENTS.md) STRICT  

