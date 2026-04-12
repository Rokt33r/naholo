# P29: Project Slug

## Goal

Add a `slug` column to projects so projects can be identified by a human-readable URL slug (e.g., `/app/projects/my-project/issues`) instead of UUID. All API routes, frontend routes, and external clients identify projects by slug. Services keep using UUID internally.

## Prerequisites

- [x] P27: Issue Numbering (established the pattern for slug-based identification)

## Architecture Decisions

- **Slug format**: Lowercase alphanumeric with hyphens (`/^[a-z0-9-]+$/`), same regex as skill-set slugs. User-provided on create, editable later.
- **Globally unique**: Add a unique index on `slug` to enforce global uniqueness. No need to scope by `userId`.
- **Resolution in permissions layer**: `requireProjectWorker(projectSlug)` resolves slug → `{ id, slug }` via DB lookup, then passes UUID to internal services. Same pattern as P27's `requireIssueAccess(issueNumber)` → UUID.
- **User-provided slug on create**: Slug is a required field when creating a project. No auto-generation.
- **Services stay UUID-based**: All service functions (`getProject`, `updateProject`, `deleteProject`, etc.) keep taking `projectId: string` (UUID). Slug is only the URL-facing identifier.
- **`projectId` in context becomes `projectSlug`**: The `ProjectContext` and `useParams` switch from `projectId` (UUID) to `projectSlug`. Components that need the UUID get it from the resolved project object.

## Tasks

### Task 1: Schema + migration

Add `slug` column in two phases: first add nullable column and backfill, then add constraints.

**Phase 1 — Add nullable column + backfill:**

- [x] `src/server/db/schema/projects.ts` — Add nullable `slug` column (no `notNull`, no unique index):
  ```ts
  slug: text('slug'),
  ```
- [x] Let the user run `npm run db:generate`. In the generated migration SQL, **append** backfill:
  ```sql
  UPDATE projects SET slug = id::text;
  ```
- [x] Let the user run `npm run db:migrate`.

**Phase 2 — Add constraints:**

- [x] `src/server/db/schema/projects.ts` — Set `notNull` and add unique index:

  ```ts
  slug: text('slug').notNull(),
  ```

  Third argument to `pgTable`:

  ```ts
  ;(table) => [uniqueIndex('projects_slug_idx').on(table.slug)]
  ```

  Import `uniqueIndex` from `drizzle-orm/pg-core`.

- [ ] Let the user run `npm run db:generate` and `npm run db:migrate`.

### Task 2: Update project service to handle slugs

- [x] `src/server/services/project.ts` — Add `slug` to the `Project` type:

  ```ts
  export type Project = {
    id: string
    slug: string
    name: string
    description: string | null
    createdAt: Date
  }
  ```

- [x] `src/server/services/project.ts` — Add `slug: true` to all `columns` selections in `getProject`, `getProjectById`, and `listProjects`.

- [x] `src/server/services/project.ts` — Update `createProject`:
  - Add `slug` to `CreateProjectInput`:
    ```ts
    export type CreateProjectInput = {
      name: string
      slug: string
      description?: string
    }
    ```
  - Validate slug format (`/^[a-z0-9-]+$/`), return error if invalid
  - Check global uniqueness, return error if taken
  - Pass `slug` to insert values
  - Return `{ id, slug }` instead of just `{ id }`

- [x] `src/server/services/project.ts` — Update `updateProject`:
  - Add optional `slug` to `UpdateProjectInput`:
    ```ts
    export type UpdateProjectInput = {
      name?: string
      description?: string
      slug?: string
    }
    ```
  - If `data.slug` is provided, validate format (`/^[a-z0-9-]+$/`) and check global uniqueness before updating (exclude current project from the check).
  - Include `slug` in the `.set()` call if provided.

### Task 3: Update `requireProjectWorker` to resolve slug

- [x] `src/server/auth/permissions.ts` — Update `requireProjectWorker`:
  - Change param from `projectId: string` to `projectSlug: string`
  - Add a DB lookup at the top to resolve slug → `{ id, slug }`:
    ```ts
    const project = await db.query.projects.findFirst({
      columns: { id: true, slug: true },
      where: (t, { eq }) => eq(t.slug, projectSlug),
    })
    if (project == null) {
      throw new NotFoundError('Project')
    }
    ```
  - Use `project.id` (UUID) for all downstream lookups (project worker resolution, API token comparison)
  - Return `project` alongside `projectWorker`: `Promise<{ projectWorker: ProjectWorker; project: { id: string; slug: string } }>`
  - Update `requireAdminProjectWorker` similarly — change param to `projectSlug: string`, call `requireProjectWorker(projectSlug)`, return both `project` and `projectWorker`.

- [x] `src/server/auth/permissions.ts` — Update `requireIssueAccess`:
  - Change first param from `projectId: string` to `projectSlug: string`
  - Resolve slug → UUID via `requireProjectWorker(projectSlug)` (already called inside), use `project.id` for the issue lookup
  - Return `project` in the result alongside `projectWorker` and `issue`

- [x] `src/server/auth/permissions.ts` — Update `requireSkillSetAccess`:
  - Change first param from `projectId: string` to `projectSlug: string`
  - Same pattern: use resolved `project.id` for DB lookups

- [x] `src/server/auth/permissions.ts` — Update `requireIssueLogAccess`, `requireIssueNoteAccess`, `requireIssueTaskAccess`:
  - Change first param from `projectId: string` to `projectSlug: string`
  - Pass through to updated `requireIssueAccess`
  - Return `project` in results

- [x] `src/server/auth/permissions.ts` — Update internal helpers:
  - `requireProjectWorkerByApiToken(projectId, token)` — keep taking UUID (called with resolved `project.id`)
  - `requireProjectWorkerByUserApiToken(projectId, token, headers)` — keep taking UUID
  - `requireProjectWorkerBySession(projectId)` — keep taking UUID

### Task 4: Rename API route directory and update handlers

Rename the filesystem directory:

```
src/app/api/projects/[projectId]/
→ src/app/api/projects/[projectSlug]/
```

This affects all route files under this directory. In each file:

- Change `projectId: string` to `projectSlug: string` in the `RouteContext` params type
- Extract: `const { projectSlug } = await context.params`
- Pass `projectSlug` to `requireProjectWorker` / `requireIssueAccess` / etc.
- Use `project.id` (from the resolved result) for service calls that need UUID

Files to update (pattern for each — extract `projectSlug`, pass to permission, use `project.id` for service):

- [x] `.../projects/[projectSlug]/route.ts` — GET, PATCH handlers. GET: use `project.id` for `getProjectById()`. PATCH: use `project.id` for `updateProject()`.
- [x] `.../projects/[projectSlug]/issues/route.ts` — GET, POST handlers. Use `project.id` for `listIssues()` / `createIssue()`.
- [x] `.../projects/[projectSlug]/issues/[issueNumber]/route.ts` — GET, PATCH, DELETE handlers
- [x] `.../projects/[projectSlug]/issues/[issueNumber]/close/route.ts` — POST, DELETE handlers
- [x] `.../projects/[projectSlug]/issues/[issueNumber]/tasks/route.ts` — GET, POST handlers
- [x] `.../projects/[projectSlug]/issues/[issueNumber]/tasks/[taskId]/route.ts` — PATCH, DELETE handlers
- [x] `.../projects/[projectSlug]/issues/[issueNumber]/tasks/[taskId]/move/route.ts` — POST handler
- [x] `.../projects/[projectSlug]/issues/[issueNumber]/logs/route.ts` — GET, POST handlers
- [x] `.../projects/[projectSlug]/issues/[issueNumber]/logs/[logId]/route.ts` — PATCH, DELETE handlers
- [x] `.../projects/[projectSlug]/issues/[issueNumber]/notes/route.ts` — GET, POST handlers
- [x] `.../projects/[projectSlug]/issues/[issueNumber]/notes/[noteId]/route.ts` — PATCH, DELETE handlers
- [x] `.../projects/[projectSlug]/workers/route.ts` — GET handler
- [x] `.../projects/[projectSlug]/workers/[workerId]/route.ts` — GET handler
- [x] `.../projects/[projectSlug]/workers/[workerId]/tokens/route.ts` — GET, POST handlers
- [x] `.../projects/[projectSlug]/workers/[workerId]/tokens/[tokenId]/route.ts` — DELETE handler
- [x] `.../projects/[projectSlug]/skill-sets/route.ts` — GET, POST handlers
- [x] `.../projects/[projectSlug]/skill-sets/[skillSetSlug]/route.ts` — GET, PATCH, DELETE handlers
- [x] `.../projects/[projectSlug]/skill-sets/[skillSetSlug]/skills/route.ts` — GET handler
- [x] `.../projects/[projectSlug]/skill-sets/[skillSetSlug]/skills/[name]/route.ts` — GET, PUT, DELETE handlers

**Pattern for each handler** (example from issues/route.ts):

```ts
// Before:
const { projectId } = await context.params
const { projectWorker } = await requireProjectWorker(projectId)
const issues = await listIssues({ projectId })

// After:
const { projectSlug } = await context.params
const { projectWorker, project } = await requireProjectWorker(projectSlug)
const issues = await listIssues({ projectId: project.id })
```

### Task 5: Update `naholo-api` package types

- [ ] `packages/naholo-api/src/types.ts` — Add `slug: string` to project types:
  - `Project` type: add `slug: string` field
  - `ProjectWithWorker` already extends `Project`, so inherits slug

### Task 6: Update `naholo-api` client to use slug

- [ ] `packages/naholo-api/src/client.ts` — Rename `projectPath` helper:
  - Rename param from `projectId` to `projectSlug`: `private projectPath(projectSlug: string, suffix = '')`
  - Path stays the same shape: `/api/projects/${projectSlug}`

- [ ] Update `issuePath` and `skillSetPath` helpers to use `projectSlug` param name.

- [ ] Update all client methods to take `projectSlug: string` instead of `projectId: string`:
  - `getProject(projectSlug)`, `updateProject(projectSlug, input)`
  - `listIssues(projectSlug, opts?)`, `createIssue(projectSlug, input)`, `getIssue(projectSlug, issueNumber)`, etc.
  - `listTasks(projectSlug, issueNumber)`, `createTask(...)`, `updateTask(...)`, `deleteTask(...)`, `moveTask(...)`
  - `listNotes(projectSlug, issueNumber)`, `createNote(...)`, `updateNote(...)`, `deleteNote(...)`
  - `listLogs(projectSlug, issueNumber)`, `createLog(...)`, `deleteLog(...)`
  - `listSkillSets(projectSlug)`, `getSkillSet(...)`, `createSkillSet(...)`, `updateSkillSet(...)`, `deleteSkillSet(...)`
  - `listSkills(projectSlug, skillSetSlug)`, `getSkill(...)`, `upsertSkill(...)`, `deleteSkill(...)`
  - `listWorkers(projectSlug)`, `getWorker(...)`, `listWorkerTokens(...)`, `createWorkerToken(...)`, `deleteWorkerToken(...)`

### Task 7: Update server actions

- [ ] `src/app/app/actions.ts` — Update `createProjectAction`:
  - Add `slug` param: `createProjectAction(name: string, slug: string, description?: string)`
  - Pass `slug` to `createProject`
  - Return `ReturnResult<{ id: string; slug: string }>` instead of `ReturnResult<{ id: string }>`

- [ ] `src/app/app/actions.ts` — Update all actions that take `projectId`:
  - `updateProjectAction(id, ...)` → `updateProjectAction(projectSlug: string, ...)` — call `requireAdminProjectWorker(projectSlug)`, use `project.id` for `updateProject()`
  - `deleteProjectAction(id)` → `deleteProjectAction(projectSlug: string)` — same pattern
  - `createIssueAction(projectId, title)` → `createIssueAction(projectSlug: string, title)` — call `requireProjectWorker(projectSlug)`, use `project.id` for `createIssue()`
  - `createLogAction(projectId, issueNumber, content)` → `createLogAction(projectSlug: string, issueNumber, content)` — call `requireIssueAccess(projectSlug, issueNumber)`, use `project.id` for `createLog()`
  - `createTaskAction`, `updateTaskAction`, `setTaskDoneAction`, `deleteTaskAction` — same pattern: change first param to `projectSlug`, use resolved `project.id` for service calls

- [ ] Update `revalidatePath` calls in all actions:
  - Change from `revalidatePath('/app/projects/${projectId}')` to `revalidatePath('/app/projects/${projectSlug}')`
  - Change from `revalidatePath('/app/projects/${projectId}/issues/${issueNumber}')` to `revalidatePath('/app/projects/${projectSlug}/issues/${issueNumber}')`

### Task 8: Update frontend routing

- [ ] Rename directory:

  ```
  src/app/app/projects/[projectId]/
  → src/app/app/projects/[projectSlug]/
  ```

- [ ] `src/app/app/projects/[projectSlug]/layout.tsx`:
  - Change `useParams` to extract `projectSlug`: `const { projectSlug } = useParams<{ projectSlug: string }>()`
  - Change project lookup from `p.id === projectId` to `p.slug === projectSlug`
  - Update `ProjectContext` value: pass `projectSlug` instead of `projectId`, and also pass `projectId` from `project.id`

- [ ] `src/app/app/projects/[projectSlug]/page.tsx` — Update `useParams` to extract `projectSlug`

- [ ] `src/app/app/projects/[projectSlug]/issues/page.tsx` — Update `useParams` to extract `projectSlug`

- [ ] `src/app/app/projects/[projectSlug]/issues/[issueNumber]/page.tsx` — Update `useParams` to extract `projectSlug`

- [ ] `src/app/app/projects/[projectSlug]/workers/page.tsx` — Update `useParams` to extract `projectSlug`

- [ ] `src/app/app/projects/[projectSlug]/workers/[workerId]/page.tsx` — Update `useParams` to extract `projectSlug`

- [ ] `src/app/app/projects/[projectSlug]/skill-sets/page.tsx` — Update `useParams`

- [ ] `src/app/app/projects/[projectSlug]/skill-sets/[slug]/page.tsx` — Update `useParams`

- [ ] `src/app/app/projects/[projectSlug]/skill-sets/[slug]/skills/[skillName]/page.tsx` — Update `useParams`

### Task 9: Update `ProjectContext`

- [ ] `src/components/app/project-context.tsx` — Update context type:
  ```ts
  type ProjectContextValue = {
    projectId: string // UUID (for internal use like cache keys)
    projectSlug: string // slug (for URL construction)
    projectName: string
    projects: Project[]
    currentWorker: ProjectWorkerInfo
  }
  ```

### Task 10: Update frontend hooks to use slug

- [ ] `src/hooks/use-issues.ts` — Update all hooks:
  - Change first param from `projectId: string` to `projectSlug: string`
  - Change API paths from `/api/projects/${projectId}/...` to `/api/projects/${projectSlug}/...`
  - Query keys: use `projectSlug` (e.g., `['issues', projectSlug, filter]`)

- [ ] `src/hooks/use-tasks.ts` — Update all hooks:
  - Change `projectId` to `projectSlug` in API paths

- [ ] `src/hooks/use-logs.ts` — Update all hooks:
  - Change `projectId` to `projectSlug` in API paths

- [ ] `src/hooks/use-notes.ts` — Update all hooks:
  - Change `projectId` to `projectSlug` in API paths

### Task 11: Update frontend components

- [ ] `src/components/projects/project-switcher.tsx`:
  - Change `handleProjectClick` to navigate to `/app/projects/${project.slug}` instead of `${project.id}`
  - Change `currentProjectId` prop to `currentProjectSlug`
  - Change active check from `project.id === currentProjectId` to `project.slug === currentProjectSlug`

- [ ] `src/components/projects/create-project-dialog.tsx`:
  - Add a slug input field (required, validated with `/^[a-z0-9-]+$/`)
  - Pass slug to `createProjectAction(name, slug, description)`
  - Change navigation after creation from `router.push('/app/projects/${result.data.id}')` to `router.push('/app/projects/${result.data.slug}')`

- [ ] `src/components/issues/create-issue-dialog.tsx`:
  - Uses `projectId` from context — switch to `projectSlug` for URL construction

- [ ] `src/components/issues/issue-detail.tsx`:
  - Update navigation from `router.push('/app/projects/${projectId}...')` to use `projectSlug`
  - Update all hook calls to pass `projectSlug` instead of `projectId`

- [ ] `src/components/app/app-mode-sidebar.tsx`:
  - Change `currentProjectId` prop to `currentProjectSlug`
  - Update all `router.push` calls from `/app/projects/${currentProjectId}/...` to `/app/projects/${currentProjectSlug}/...`

- [ ] `src/components/app/app-mode-menu.tsx`:
  - Same changes as sidebar — use `currentProjectSlug` for navigation

- [ ] All other components using `useProjectContext()` that reference `projectId` for URL construction — switch to `projectSlug`. Components using `projectId` for non-URL purposes (like passing to server actions or as cache keys) need to use the UUID from context.

### Task 12: Update MCP tools in CLI package

- [ ] `packages/naholo-cli/src/mcp/tools.ts` — Change `projectId` param to `projectSlug`:
  - `registerTools(server, client, projectSlug: string)`
  - All client calls already pass this as the first arg — since the client methods are also renamed to `projectSlug`, this flows through naturally

- [ ] `packages/naholo-cli/src/mcp/resources.ts` — Change `projectId` param to `projectSlug`:
  - `registerResources(server, client, projectSlug: string)`
  - All client calls use the renamed methods

- [ ] `packages/naholo-cli/src/project-config.ts` — Update config interface:
  - Add `projectSlug: string` to `ProjectConfig`
  - Keep `projectId` for backward compatibility (existing `.naholo/config.yml` files still have it)
  - The CLI entrypoint should prefer `projectSlug` and fall back to `projectId`

- [ ] Update the CLI entrypoint (where `registerTools` / `registerResources` are called) to pass `projectSlug` instead of `projectId`.

### Task 13: Verify

- [ ] Run `npx tsc` from the repo root to confirm everything compiles without type errors across the main app, `naholo-api`, and `naholo-cli` packages.

## Notes

- **Slug uniqueness is global**. No two projects can share the same slug, regardless of owner.
- **Slug is mutable** — unlike issue numbers, users can rename their project slug. This means bookmarked URLs may break on slug change. Acceptable tradeoff for human-readable URLs.
- **Internal services stay UUID-based** — the slug is resolved to UUID at the permissions layer (`requireProjectWorker`), and all downstream service calls use UUID. This minimizes the blast radius of changes.
- **API token comparison** in `requireProjectWorkerByApiToken` compares `result.projectWorker.projectId` (UUID) against the resolved `project.id` (UUID), not the slug. This is correct.
- **CLI backward compatibility** — existing `.naholo/config.yml` files have `projectId` (UUID). The CLI should handle both `projectSlug` and `projectId` during a transition period.
