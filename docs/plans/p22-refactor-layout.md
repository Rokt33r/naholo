# P22: Refactor Layout — Issues App Routing & SSR Removal

## Motivation

Now that we have an app mode concept (with only "issues" for now), the layout structure should reflect this. Currently, `ProjectLayout` directly renders the issues list and all issue-related UI, but this should be scoped under an **IssuesLayout** so that future app modes (e.g., wiki, board) can have their own layouts without cluttering the project-level layout.

Additionally, the app is entirely client-driven (React Query for data, client-side nav), so the server components in `IssuePage` add complexity without real benefit. We should simplify by removing SSR data-fetching from page components.

---

## Current Structure

```
src/app/app/projects/[projectId]/
├── layout.tsx          ← ProjectLayout (server): auth, loads project, renders ProjectLayoutClient
├── page.tsx            ← ProjectPage: returns null
└── issues/
    └── [issueId]/
        └── page.tsx    ← IssuePage (server): loads issue + notes, renders IssueClientPage
```

**ProjectLayoutClient** (`components/app/project-layout-client.tsx`) does everything:

- Renders `AppModeSidebar` (desktop) / `AppModeMenu` (mobile)
- Renders `IssuesList` (always on desktop, conditionally on mobile)
- Renders `{children}` (issue detail or null)
- Provides `ProjectContext`, `QueryProvider`, `IssuesListProvider`

**Problems:**

1. `ProjectLayout` is tightly coupled to issues — it renders `IssuesList` directly
2. `ProjectPage` returns `null` — no UI for "no issue selected" state
3. `IssuePage` server component fetches issue + notes, but client re-fetches via React Query anyway (double fetch)
4. No clean place to add a second app mode's layout
5. `ProjectLayout` (server) + `ProjectLayoutClient` (client) split adds indirection — the server component only fetches data that can be fetched client-side

---

## Proposed Structure

### Route Changes

```
src/app/app/projects/[projectId]/
├── layout.tsx          ← ProjectLayout (client): sidebar, context, fetches project via React Query
├── page.tsx            ← ProjectPage: redirects to /issues (or project overview later)
└── issues/
    ├── layout.tsx      ← IssuesLayout (client): renders IssuesList + {children}
    ├── page.tsx        ← IssuesIndexPage: "No issue selected" placeholder
    └── [issueId]/
        └── page.tsx    ← IssuePage (client): loads issue via React Query only
```

### Detailed Changes

#### 1. Merge `ProjectLayout` + `ProjectLayoutClient` into one client component

The parent `AppLayout` already handles auth via `requireAuthOrRedirect()`. Project data (project list, current project) can be fetched client-side via new `useProjects` / `useProject` hooks. This eliminates the server/client split.

Delete `src/components/app/project-layout-client.tsx` — its logic moves directly into `layout.tsx`.

```tsx
// src/app/app/projects/[projectId]/layout.tsx
'use client'

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { projectId } = useParams<{ projectId: string }>()
  const isMobile = useIsMobile()
  const { data: projects = [] } = useProjects()
  const project = projects.find((p) => p.id === projectId)

  if (!project) {
    return <ProjectSkeleton />
  }

  return (
    <QueryProvider>
      <ProjectContext
        value={{ projectId, projectName: project.name, projects }}
      >
        <div className='flex h-screen w-full'>
          {!isMobile && (
            <AppModeSidebar currentProjectId={projectId} currentMode='issues' />
          )}
          <div className='flex-1 overflow-hidden'>{children}</div>
        </div>
      </ProjectContext>
    </QueryProvider>
  )
}
```

**Eliminated:** `ProjectLayoutClient` component file, server-side `getProject` / `listProjects` calls in layout.

**New hooks needed:** `useProjects()` to fetch user's project list client-side.

#### 2. New `IssuesLayout` (client component)

Owns the issues list panel, responsive list/detail toggling, and `IssuesListProvider`.

```tsx
// src/app/app/projects/[projectId]/issues/layout.tsx
'use client'

export default function IssuesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { projectId, projectName, projects } = useProjectContext()
  const isMobile = useIsMobile()
  const segment = useSelectedLayoutSegment() // null at /issues, "[issueId]" at /issues/[issueId]
  const showList = !isMobile || segment === null

  return (
    <IssuesListProvider>
      {!isMobile && (
        <IssuesListPanel>
          <IssuesList
            projectId={projectId}
            projectName={projectName}
            projects={projects}
          />
        </IssuesListPanel>
      )}
      {showList && isMobile ? (
        <div className='flex-1 overflow-hidden'>
          <IssuesList
            projectId={projectId}
            projectName={projectName}
            projects={projects}
          />
        </div>
      ) : (
        <div className='flex-1 overflow-hidden'>{children}</div>
      )}
    </IssuesListProvider>
  )
}
```

#### 3. New `IssuesIndexPage` — "No issue selected" state

```tsx
// src/app/app/projects/[projectId]/issues/page.tsx
'use client'

export default function IssuesIndexPage() {
  const isMobile = useIsMobile()
  if (isMobile) {
    return null // mobile shows list via layout
  }

  return (
    <div className='flex h-full items-center justify-center text-muted-foreground'>
      Select an issue to get started
    </div>
  )
}
```

#### 4. Convert `IssuePage` to client-only

Remove server-side data fetching. Use React Query hooks that already exist.

```tsx
// src/app/app/projects/[projectId]/issues/[issueId]/page.tsx
'use client'

export default function IssuePage() {
  const { projectId, issueId } = useParams<{
    projectId: string
    issueId: string
  }>()
  // IssueClientPage already uses useNotes() and useLogs() internally
  // Just need to also fetch the issue via React Query
  const { data: issue, isLoading } = useIssue(projectId, issueId)

  if (isLoading) {
    return <IssueSkeleton />
  }
  if (!issue) {
    return <IssueNotFound />
  }

  return <IssueClientPage issue={issue} />
}
```

> **Requires:** A `useIssue(projectId, issueId)` hook (or rename existing). The `notes` prop can be removed from `IssueClientPage` since it already calls `useNotes()` internally.

#### 5. Update `ProjectPage`

For now, redirect to `/issues`. Later this can become a project overview.

```tsx
// src/app/app/projects/[projectId]/page.tsx
'use client'

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/app/projects/${projectId}/issues`)
  }, [router, projectId])

  return null
}
```

> Client-side redirect since layout is now a client component. Alternatively, use a route group to skip this page entirely.

---

## SSR Simplification Notes

**What SSR currently does:**

- `AppLayout`: auth check (keep this — it's a security boundary)
- `ProjectLayout`: loads project + project list, renders `ProjectLayoutClient`
- `IssuePage`: fetches issue + notes, passes as props to `IssueClientPage`

**Why remove SSR from ProjectLayout and IssuePage:**

- `AppLayout` already guards auth — `ProjectLayout` doesn't need to duplicate it
- `IssueClientPage` already re-fetches via `useNotes()` and `useLogs()` — the server data is only used as `initialNotes`
- Client-side navigation between issues doesn't hit the server component anyway (soft nav)
- Removing SSR here simplifies the data flow: single source of truth = React Query cache
- No SEO benefit (authenticated app behind login)
- Eliminates the `ProjectLayout` (server) + `ProjectLayoutClient` (client) indirection

**What stays as server components:**

- `AppLayout` — auth guard (security boundary)
- Root/auth layouts — static structure

---

## New Hooks

### `useProjects`

Fetch user's project list client-side:

```tsx
// src/hooks/use-projects.ts
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => fetcher('/api/projects'),
  })
}
```

Needs a GET endpoint:

```
GET /api/projects
```

### `useIssue` (already exists)

Already implemented in `src/hooks/use-issues.ts` with query key `['issue', projectId, issueId]`. All existing mutations (`useUpdateIssueTitle`, `useCloseIssue`, `useReopenIssue`) already sync both the `['issue', ...]` detail cache and `['issues', ...]` list cache via optimistic updates + `onSettled` invalidation. No additional sync work needed.

---

## Migration Steps

- [x] **Add `GET /api/projects` endpoint** — `src/app/api/projects/route.ts`
- [x] **Add `useProjects` hook** — `src/hooks/use-projects.ts`
- [x] **Create `issues/layout.tsx`** — `IssuesLayout` with issues list, responsive toggling, `IssuesListProvider`
- [x] **Create `issues/page.tsx`** — "Create or select an issue" placeholder for desktop, null for mobile
- [x] **Merge `ProjectLayout` into client component** — `ProjectLayoutInner` (uses `useProjects`) wrapped by `QueryProvider`
- [x] **Extract `ProjectContext` to `project-context.tsx`** — shared context consumed by `IssuesLayout`
- [x] **Delete `project-layout-client.tsx`** — logic split between `project-context.tsx`, `layout.tsx`, and `issues/layout.tsx`
- [x] **Convert `issues/[issueId]/page.tsx` to client component** — uses `useIssue`, `useLogs`, `useNotes` directly
- [x] **Merge `IssueClientPage` into `issues/[issueId]/page.tsx`** — eliminated wrapper, inlined all logic into page
- [x] **Update `ProjectPage` to redirect to `/issues`** — client-side redirect via `useEffect` + `router.replace`
- [x] **Type check** — passes clean
- [x] **Test responsive behavior** — ensure mobile list/detail toggling still works with new layout nesting

---

## Risk & Considerations

- **Loading states:** Without SSR, project layout and issue detail will show skeletons on first visit. Acceptable for an authenticated app — subsequent navigations are instant via React Query cache.
- **URL structure change:** `/projects/:id` now redirects to `/projects/:id/issues`. Bookmarks to `/projects/:id` still work via redirect.
- **Layout nesting depth:** Adding `IssuesLayout` adds one more layout level. Next.js handles this fine, and it's the correct architectural separation.
- **Future app modes:** With this structure, adding a new mode (e.g., wiki) is clean: create `wiki/layout.tsx` + `wiki/page.tsx` alongside `issues/`.
- **Auth gap:** `ProjectLayout` no longer validates project ownership server-side. API endpoints still enforce auth, so this is a UI-only concern (invalid project shows skeleton/empty state, not someone else's data).
