# P20: Tool Sidebar Style Improvements

## Target Files

- `src/components/ui/tooltip.tsx` — Tooltip styling
- `src/components/ui/tool-sidebar.tsx` — Sidebar background/layout
- `src/app/globals.css` — Theme variables

## Issues

### 1. Tooltip colors look off in dark theme

**Current state:** `TooltipContent` uses `bg-foreground text-background` (line 49 of tooltip.tsx). In dark mode, `--foreground` is `oklch(0.985 0 0)` (near-white) and `--background` is `oklch(0.145 0 0)` (near-black), so the tooltip renders as a bright white box with dark text. This inverted contrast feels jarring against the dark UI.

**Fix:** Use `bg-primary text-primary-foreground` instead, which in dark mode gives a white-on-dark tooltip that matches the theme better.

The arrow also uses `bg-foreground fill-foreground` and needs to match whatever the content background becomes.

### 2. Tool sidebar lacks visual distinction from main content

**Current state:** `ToolSidebar` has no explicit background — it inherits `bg-background` from the body. This makes it blend into the rest of the layout.

**Fix (Option B chosen):** Define `--tool-sidebar` / `--tool-sidebar-foreground` in `globals.css` for both `:root` and `.dark`, then map them in the `@theme inline` block. Also removed all unused `--sidebar*` variables since the old sidebar component was already deleted.

## Changes

### tooltip.tsx

- [x] Change `TooltipContent` className from `bg-foreground text-background` to `bg-primary text-primary-foreground`
- [x] Update `TooltipPrimitive.Arrow` className from `bg-foreground fill-foreground` to `bg-primary fill-primary`

### tool-sidebar.tsx

- [x] Add `bg-tool-sidebar text-tool-sidebar-foreground` to the `<nav>` element's className

### globals.css

- [x] Add `--tool-sidebar` and `--tool-sidebar-foreground` to both `:root` and `.dark` blocks
- [x] Add `--color-tool-sidebar` / `--color-tool-sidebar-foreground` mapping in `@theme inline`
- [x] Remove all unused `--sidebar*` variables (8 vars per theme + 8 theme mappings)
