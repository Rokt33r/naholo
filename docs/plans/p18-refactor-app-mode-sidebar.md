# Refactor App Mode Sidebar

## Problem

`AppModeSidebar` is built on top of `ui/sidebar.tsx` (shadcn), which carries a lot of
baggage that doesn't apply here:

- `SidebarProvider` with expand/collapse state, cookies, and keyboard shortcuts
- Tooltip visibility tied to `state !== 'collapsed'` — but this sidebar is always icon-only
- `SidebarMenu` / `SidebarMenuItem` rendered as `<ul>` / `<li>` with list semantics
- Dozens of exported sub-components that are never used in this context

We need a purpose-built, minimal `ToolSidebar` that is permanently icon-only and always
shows tooltips.

## Target layout

```
┌──────┐
│      │  ← py-2 padding
│  🗒  │  Issues  (active state possible)
│  🌐  │  Epics
│  📖  │  Wiki
│      │
│ flex │  ← ToolSidebarSpacing (flex-1 pushes bottom items down)
│      │
│  ⚙  │  Settings
└──────┘
```

## New components (`src/components/ui/tool-sidebar.tsx`)

### `ToolSidebar`

Simple vertical container. No context, no provider.

```tsx
// <nav> with role for accessibility
<nav className='flex h-full flex-col items-center py-2'>{children}</nav>
```

### `ToolSidebarButton`

Icon-only button with a Tooltip always rendered (not gated on sidebar state).

Props:

- `isActive?: boolean` — highlights the button
- `tooltip: string` — label shown in the tooltip (side="right")
- `onClick?: () => void`
- standard button props

Styling: `size-9 rounded-md` square button, hover + active styles via Tailwind.

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <button
      className={cn(
        'flex size-9 items-center justify-center rounded-md transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-accent text-accent-foreground',
      )}
      {...props}
    />
  </TooltipTrigger>
  <TooltipContent side='right'>{tooltip}</TooltipContent>
</Tooltip>
```

### `ToolSidebarSpacing`

Simple flex spacer to push bottom items down.

```tsx
<div className='flex-1' />
```

## Changes to `app-mode-sidebar.tsx`

- Replace all `Sidebar*` imports with the three new components
- Wrap in `TooltipProvider` (since we're no longer inside `SidebarProvider`)
- Settings button keeps its `DropdownMenu` — no change to that logic

```tsx
<TooltipProvider delayDuration={0}>
  <ToolSidebar>
    <ToolSidebarButton
      isActive={currentMode === 'issues'}
      tooltip='Issues'
      onClick={() => router.push(`/app/projects/${currentProjectId}`)}
    >
      <ListTodo className='size-5' />
    </ToolSidebarButton>

    <ToolSidebarSpacing />

    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolSidebarButton tooltip='Settings'>
          <Settings className='size-5' />
        </ToolSidebarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' side='right'>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className='mr-2 h-4 w-4' />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </ToolSidebar>
</TooltipProvider>
```

## Files to create / modify

| File                                      | Action                                                            |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `src/components/ui/tool-sidebar.tsx`      | Create — `ToolSidebar`, `ToolSidebarButton`, `ToolSidebarSpacing` |
| `src/components/app/app-mode-sidebar.tsx` | Modify — swap in new components                                   |

`ui/sidebar.tsx` is left untouched (other parts of the app may use it).
