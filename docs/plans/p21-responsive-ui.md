# P21: Responsive UI

When window width is too narrow (mobile), we need to change the rendering strategy.

## Breakpoint

Use a `useIsMobile()` hook (e.g., media query `max-width: 767px`) to determine mobile vs desktop mode. This should be a single source of truth consumed by layout, sidebar, and navigation components.

---

## 1. App Mode Sidebar → Dropdown Menu (Mobile)

### Current state

- `AppModeSidebar` renders a vertical `ToolSidebar` with:
  - Issues button (navigates to project page)
  - Spacer
  - Settings dropdown (logout only)
- Always visible as a fixed-width column in the three-panel flex layout

### Target (mobile)

Hide `AppModeSidebar` completely. Replace with an icon button in the issue list header (or top bar) that opens a dropdown menu containing:

1. App mode buttons (e.g., Issues — currently the only mode)
2. Separator
3. Settings button (logout)

### Implementation

- In `projects/[projectId]/layout.tsx`: conditionally render `AppModeSidebar` only on desktop
- Create a new `AppModeMenu` client component that renders a `DropdownMenu` with the same items
- Place `AppModeMenu` inside `IssuesList` header area (visible on mobile only)
- The `IssuesList` component needs a prop or context to know if it's mobile mode, so it can render the menu button

### Files to change

- `src/app/app/projects/[projectId]/layout.tsx` — conditional sidebar rendering
- `src/components/app/app-mode-sidebar.tsx` — extract shared menu items or keep as-is
- New: `src/components/app/app-mode-menu.tsx` — dropdown version for mobile
- `src/components/issues/issues-list.tsx` — render `AppModeMenu` in header on mobile

---

## 2. Issue List & Detail Navigation (Mobile)

### Current state

- `projects/[projectId]/page.tsx` (server component) auto-redirects to the first issue via `redirect()`
- The layout always renders both `IssuesListPanel` (w-80 sidebar) and the detail panel side-by-side
- Clicking an issue item does `router.push()` to the issue detail route
- Both list and detail are always visible (list collapsible but still rendered in DOM)

### Problems on mobile

1. **Server-side redirect** happens before we can check screen size — mobile users never see the issue list page
2. **Side-by-side layout** doesn't work on narrow screens — need full-screen list OR full-screen detail, not both
3. Navigating back from issue detail to the list requires a way to go "back"

### Target (mobile)

- **Dedicated issue list page**: When on `/app/projects/[projectId]`, show the issue list full-screen (no redirect)
- **Issue detail page**: When on `/app/projects/[projectId]/issues/[issueId]`, show the detail full-screen (no list sidebar)
- **Back navigation**: Issue detail page shows a back button to return to the issue list

### Target (desktop)

- Keep current behavior: auto-redirect to first issue on mount (client-side, not server-side)
- Keep side-by-side list + detail layout

### Implementation

#### Step 0: Create `useIsMobile()` hook

Create a shared hook that all responsive components consume.

- [x] Create `src/hooks/use-is-mobile.ts`
  - Use `window.matchMedia('(max-width: 767px)')` with an event listener
  - Return `boolean` (default `false` for SSR — matches desktop, avoids layout shift for the common case)
  - Listen to `change` event on the `MediaQueryList` so it updates reactively on resize

#### Step 1: App mode sidebar → dropdown menu (mobile)

- [x] Create `src/components/app/app-mode-menu.tsx`
  - Client component rendering a `DropdownMenu` (Radix)
  - Trigger: an icon button (e.g., `Menu` or `ListTodo` icon from lucide)
  - Menu items: Issues button (navigates to `/app/projects/${projectId}`), separator, Logout button
  - Props: `currentProjectId: string`
  - Reuse `logoutAction` from `@/app/app/actions`

#### Step 2: Adjust layout for mobile

The layout (`src/app/app/projects/[projectId]/layout.tsx`) is a server component, so it can't call `useIsMobile()` directly. It needs to become a hybrid: the server component fetches data and the client component handles responsive rendering.

- [x] Create `src/components/app/project-layout-client.tsx`
  - Client component that wraps the three-panel layout
  - Calls `useIsMobile()` to decide what to render
  - Props: `projectId`, `projectName`, `projects` (same data the server layout currently passes to children), and `children`
  - **Desktop**: Renders `AppModeSidebar` + `IssuesListPanel` (with `IssuesList`) + `children` (current behavior)
  - **Mobile**: Renders only `children` full-screen (no sidebar, no list panel — the active route fills the screen)
- [x] Modify `src/app/app/projects/[projectId]/layout.tsx`
  - Keep the server-side data fetching (`listProjects`, `getProject`, auth check)
  - Replace the inline JSX with `<ProjectLayoutClient>` and pass the fetched data as props
  - Move `QueryProvider` and `IssuesListProvider` into `ProjectLayoutClient`

#### Step 3: Move redirect logic from server to client

Currently `src/app/app/projects/[projectId]/page.tsx` does a server-side `redirect()` to the first issue. This runs before we can check screen size — mobile users never see the issue list.

- [x] Modify `src/app/app/projects/[projectId]/page.tsx`
  - Remove the `listIssues` call and the `redirect()` logic
  - Remove the empty state UI (it moves to the client component)
  - Render `<ProjectPageClient projectId={projectId} />` instead
- [x] Create `src/components/issues/project-page-client.tsx`
  - Client component with `useIsMobile()` and `useIssues(projectId, filter)`
  - **Desktop + has issues**: On mount, `router.replace()` to the first issue. Use a `hasRedirected` ref so it only fires once (not on resize or re-render)
  - **Desktop + no issues**: Show the empty state ("No issues yet")
  - **Mobile**: Always render the full-screen issue list. Show `AppModeMenu` in the header (replacing the `PanelLeftClose` collapse button that `IssuesList` currently shows). The existing `IssuesList` component renders at full width. The `PanelLeftClose` button in `IssuesList` header should be hidden on mobile since there's no sidebar to collapse.

#### Step 4: Hide collapse button in IssuesList on mobile

`IssuesList` currently has a `PanelLeftClose` button in the header that toggles the `IssuesListPanel` collapse. On mobile, the list panel doesn't exist, so this button should be hidden.

- [x] Modify `src/components/issues/issues-list.tsx`
  - Accept an optional `isMobile` prop (or use `useIsMobile()` directly)
  - When mobile: hide the `PanelLeftClose` button, show `AppModeMenu` in its place
  - When desktop: keep current behavior (show `PanelLeftClose` collapse toggle)

#### Step 5: Back button on issue detail (mobile)

In `issue-detail.tsx`, the header currently shows a `PanelLeftOpen` button (to expand the collapsed issues list) when `collapsed` is true. On mobile, replace this with a back arrow button.

- [x] Modify `src/components/issues/issue-detail.tsx`
  - Accept `isMobile` prop (passed down from `IssueClientPage`)
  - When mobile: always show a back button (`ArrowLeft` icon) before the title that navigates to `/app/projects/${projectId}` (preserving search params like `?filter=`)
  - When desktop: keep current behavior (show `PanelLeftOpen` only when `collapsed`)
- [x] Modify `src/components/issues/issue-client-page.tsx`
  - Use `useIsMobile()` and pass `isMobile` to `IssueDetail`

#### Step 6: No forced redirect on resize

This is handled by the implementation in Step 3:

- The `hasRedirected` ref in `ProjectPageClient` ensures the desktop redirect only fires once on mount
- Shrinking a desktop window to mobile while viewing a detail page does nothing — the layout reactively hides the sidebar/list, but no navigation occurs
- Expanding from mobile to desktop while on the list page doesn't re-trigger the redirect (ref prevents it)

No additional changes needed — just verify this behavior works correctly.

- [ ] Verify: expanding from mobile to desktop on the list page doesn't cause unwanted redirects
- [ ] Verify: shrinking from desktop to mobile on the detail page keeps the user on the detail page

---

## 3. Checklist Summary

**New files:**

- [x] `src/hooks/use-is-mobile.ts` — `useIsMobile()` hook using media query
- [x] `src/components/app/app-mode-menu.tsx` — dropdown menu for mobile (replaces vertical sidebar)
- [x] `src/components/app/project-layout-client.tsx` — client wrapper for the project layout
- [x] `src/components/issues/project-page-client.tsx` — client wrapper for the project page with conditional redirect

**Modified files:**

- [x] `src/app/app/projects/[projectId]/layout.tsx` — delegate to `ProjectLayoutClient`
- [x] `src/app/app/projects/[projectId]/page.tsx` — remove server redirect, use `ProjectPageClient`
- [x] `src/components/issues/issues-list.tsx` — hide collapse button on mobile, show `AppModeMenu`
- [x] `src/components/issues/issue-detail.tsx` — back button on mobile (replaces collapse toggle)
- [x] `src/components/issues/issue-client-page.tsx` — pass `isMobile` to `IssueDetail`

---

## 4. Edge Cases

- **SSR hydration**: `useIsMobile()` defaults to `false` (desktop) on server render. Updates on mount. This avoids layout shift for the majority of users (desktop).
- **No issues + desktop**: Show empty state (current behavior preserved, rendered by `ProjectPageClient`)
- **No issues + mobile**: Show empty state full-screen with create issue prompt
- **Deep link to issue on mobile**: Works — layout hides sidebar, shows detail full-screen, back button available
- **Resize desktop → mobile while on issue list**: List stays visible, no navigation. Layout reactively hides sidebar.
- **Resize desktop → mobile while on issue detail**: Detail stays visible, layout reactively hides sidebar and list panel.
- **Resize mobile → desktop while on issue list**: Sidebar and list panel appear. Redirect does NOT re-fire (ref guard).
