# P15: Renew App Layout

## Goal

Replace the left project-selector sidebar with a VSCode-style **app mode icon bar**, and move project switching into a **ProjectSwitcher dropdown** in the issues list header.

## Current State

```
┌──────────────────────────────────────────────────────┐
│ 60px │       320px          │                        │
│ Proj │  Issues List         │  Issue Detail          │
│ Bar  │                      │                        │
│ ┌──┐ │ ┌──────────────────┐ │ ┌──────────────────┐  │
│ │NP│ │ │ ProjectName [O][+]│ │ │ Issue Title  [⋮] │  │
│ │--│ │ │ [Search...]      │ │ │ [Tasks][Note][+] │  │
│ │ +│ │ │ Issue 1          │ │ │ ...              │  │
│ │--│ │ │ Issue 2          │ │ │                   │  │
│ │⚙ │ │ └──────────────────┘ │ └──────────────────┘  │
│ └──┘ │                      │                        │
└──────────────────────────────────────────────────────┘
  ProjectSidebar               IssueDetail
  (project initials)           (h1 = issue title)
```

## Target State

```
┌──────────────────────────────────────────────────────┐
│ 48px │       320px          │                        │
│ Mode │  Issues List         │  Issue Detail          │
│ Bar  │                      │                        │
│ ┌──┐ │ ┌──────────────────┐ │ ┌──────────────────┐  │
│ │📋│ │ │ ProjName ▾ [O][+]│ │ │ Issue Title  [⋮] │  │
│ │  │ │ │ [Search...]      │ │ │ [Tasks][Note][+] │  │
│ │  │ │ │ Issue 1          │ │ │ ...              │  │
│ │  │ │ │ Issue 2          │ │ │                   │  │
│ │--│ │ └──────────────────┘ │ └──────────────────┘  │
│ │⚙ │ │                      │                        │
│ └──┘ │                      │                        │
└──────────────────────────────────────────────────────┘
  AppModeSidebar               IssueDetail
  (Issues icon active)         (h1 = issue title, unchanged)
```

## Changes

### 1. New Component: `AppModeSidebar`

**File:** `src/components/app/app-mode-sidebar.tsx`

Replaces `ProjectSidebar`. A VSCode-style vertical icon bar:

- **Width:** 48px (use `SIDEBAR_WIDTH_ICON` = `3rem`)
- **Content:** Vertically stacked mode icons
  - `ListTodo` icon for "Issues" mode (only mode for now)
  - Active state: highlighted background (same `data-active` styling as current sidebar)
  - Tooltip on hover showing mode name
- **Footer:** Settings dropdown (Logout) — same as current `ProjectSidebar` footer
- **Click behavior:** Navigate to `/app/projects/{currentProjectId}` for the mode (currently no-op since only Issues exists, but route-ready)
- **Props:** `currentMode: string` (for active state)

The mode is determined by the URL path segment: `issues` → Issues mode. Future modes (epic, wiki) would add new route segments.

### 2. New Component: `ProjectSwitcher`

**File:** `src/components/projects/project-switcher.tsx`

A dropdown that shows all projects and allows switching/creating:

- **Trigger:** Current project name + `ChevronDown` icon, styled as a clickable button
- **Dropdown content:**
  - List of all projects (name + active indicator for current)
  - Separator
  - "Create project" item (opens `CreateProjectDialog`)
- **Click behavior:** Navigate to `/app/projects/{selectedProjectId}` (preserving current mode)
- **Props:** `projects: Project[]`, `currentProjectId: string`, `currentProjectName: string`
- **UI:** Use existing `DropdownMenu` primitives from Radix

### 3. Update `IssuesList` Header

**File:** `src/components/issues/issues-list.tsx`

Replace the static project name heading:

```diff
- <h2 className='font-semibold px-2'>{projectName}</h2>
+ <ProjectSwitcher
+   projects={projects}
+   currentProjectId={projectId}
+   currentProjectName={projectName}
+ />
```

**Props change:** `IssuesList` needs to receive `projects: Project[]` in addition to existing props.

### 4. Update Project Layout

**File:** `src/app/app/projects/[projectId]/layout.tsx`

- Replace `<ProjectSidebar>` with `<AppModeSidebar>`
- Pass `projects` to `IssuesList` (for the `ProjectSwitcher`)
- Update `--sidebar-width` from `60px` to `48px` (or remove custom override and let `SIDEBAR_WIDTH_ICON` handle it)

```diff
- <ProjectSidebar projects={projects} currentProjectId={projectId} />
+ <AppModeSidebar currentMode='issues' />

  <IssuesListPanel>
-   <IssuesList projectId={projectId} projectName={project.name} />
+   <IssuesList
+     projectId={projectId}
+     projectName={project.name}
+     projects={projects}
+   />
  </IssuesListPanel>
```

### 5. Clean Up

- Delete or repurpose `src/components/projects/project-sidebar.tsx` (no longer used)
- Remove the `getProjectInitials` helper if unused elsewhere
- Keep `CreateProjectDialog` — it's reused by `ProjectSwitcher`

## Files Affected

| File                                           | Action                                                 |
| ---------------------------------------------- | ------------------------------------------------------ |
| `src/components/app/app-mode-sidebar.tsx`      | **Create** — new app mode icon bar                     |
| `src/components/projects/project-switcher.tsx` | **Create** — new project dropdown                      |
| `src/components/issues/issues-list.tsx`        | **Edit** — replace project name with `ProjectSwitcher` |
| `src/app/app/projects/[projectId]/layout.tsx`  | **Edit** — swap sidebar, pass projects to issues list  |
| `src/components/projects/project-sidebar.tsx`  | **Delete** — replaced by `AppModeSidebar`              |

## Out of Scope

- Adding new app modes (epic, wiki) — future work
- Changing route structure — keep `/app/projects/[projectId]/issues/[issueId]`
- Modifying issue detail header — the `<h1>{issue.title}</h1>` stays as-is
- Mobile layout changes
