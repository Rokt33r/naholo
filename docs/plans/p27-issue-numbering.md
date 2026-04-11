# P27: Issue Numbering

## Goal

Add per-project sequential issue numbers (like GitHub's `#1`, `#2`, etc.) so issues can be easily identified and referenced. Each project maintains its own counter, and numbers are never reused even if an issue is deleted. All API routes, services, and frontend routes identify issues by number (not UUID).

## Prerequisites

None.

## Architecture Decisions

- **Counter on projects table**: Add an `issueCounter` (integer, default 0) column to the `projects` table. On each issue creation, atomically increment the counter and assign the new value as the issue's `number`. This avoids race conditions via a single `UPDATE ... RETURNING` statement inside a transaction.
- **Number on issues table**: Add a `number` (integer, NOT NULL) column to the `issues` table. Add a unique index on `(projectId, number)` to enforce uniqueness per project.
- **Number-only identification**: All routes (API + frontend), services, and hooks identify issues by `number`, not UUID. This keeps the codebase simple — one way to reference an issue.
- **Display format**: Show as `#N` prefix before the issue title in lists and detail headers (e.g., `#3 Fix login bug`).
- **Search by number**: Extend the client-side search in the issues list to also match `#N` patterns.

## Tasks

### Task 1: Schema changes

- [x] `src/server/db/schema/projects.ts` — Add `issueCounter` column:
  - Import `integer` from `drizzle-orm/pg-core` (add to existing import)
  - Add column: `issueCounter: integer('issue_counter').notNull().default(0)`

- [x] `src/server/db/schema/issues.ts` — Add `number` column and unique index:
  - Import `integer` and `uniqueIndex` from `drizzle-orm/pg-core` (add to existing import)
  - Add column: `number: integer('number').notNull()`
  - Add unique index as third argument to `pgTable`:
    ```
    (table) => [uniqueIndex('issues_project_id_number_idx').on(table.projectId, table.number)]
    ```

### Task 2: Migration for existing issues

Since existing issues don't have a `number` value, the `NOT NULL` constraint and unique index will fail on migration.

- [x] `src/server/db/schema/issues.ts` — Temporarily remove `.notNull()` from the `number` column (keep it as `integer('number')`) and remove the unique index (remove the third argument to `pgTable`). This allows the migration to add the column as nullable without a unique constraint.

- [x] Let the user run `npm run db:generate` to generate the migration file. Then find the generated migration SQL file.

- [x] In the generated migration file, **append** SQL after the `ALTER TABLE` statement to backfill numbers and add constraints:

  ```sql
  -- Backfill issue numbers per project, ordered by created_at
  WITH numbered AS (
    SELECT id, project_id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) AS rn
    FROM issues
  )
  UPDATE issues SET number = numbered.rn FROM numbered WHERE issues.id = numbered.id;

  -- Update project issue counters to match
  UPDATE projects SET issue_counter = sub.cnt
  FROM (SELECT project_id, COUNT(*) AS cnt FROM issues GROUP BY project_id) AS sub
  WHERE projects.id = sub.project_id;

  -- Now add NOT NULL and unique index
  ALTER TABLE issues ALTER COLUMN number SET NOT NULL;
  CREATE UNIQUE INDEX issues_project_id_number_idx ON issues (project_id, number);
  ```

- [x] `src/server/db/schema/issues.ts` — Restore `.notNull()` on the `number` column and restore the unique index:

  ```ts
  number: integer('number').notNull(),
  ```

  Third argument:

  ```ts
  ;(table) => [
    uniqueIndex('issues_project_id_number_idx').on(
      table.projectId,
      table.number,
    ),
  ]
  ```

- [x] Let the user run `npm run db:migrate` to apply.

### Task 3: Update `isUUID` utility

- [x] `src/lib/utils.ts` — `isUUID` was added previously. It's still useful as a general utility, keep it. No changes needed.

### Task 4: Update service functions to use number

All service functions switch from `issueId` (UUID) to `issueNumber` (number). The `issueWhere` helper and UUID branching are removed — services query directly by `(projectId, number)`.

- [x] `src/server/services/issue.ts` — Remove the `issueWhere` helper function and the `isUUID` import (no longer needed).

- [x] `src/server/services/issue.ts` — Update `getIssue`:
  - Change param from `issueIdOrNumber: string` to `issueNumber: number`
  - Replace `.where(...)` with `.where(and(eq(issues.number, data.issueNumber), eq(issues.projectId, data.projectId)))`

- [x] `src/server/services/issue.ts` — `listIssues` — already updated with `number` in select fields. No further changes.

- [x] `src/server/services/issue.ts` — `createIssue` — already updated with transaction. No further changes.

- [x] `src/server/services/issue.ts` — Update `updateIssue`:
  - Change param from `issueIdOrNumber: string` to `issueNumber: number`
  - Replace `.where(...)` with `.where(and(eq(issues.number, data.issueNumber), eq(issues.projectId, data.projectId)))`
  - Remove the `issueWhere == null` guard

- [x] `src/server/services/issue.ts` — Update `closeIssue`:
  - Change param from `issueIdOrNumber: string` to `issueNumber: number`
  - Same where clause pattern

- [x] `src/server/services/issue.ts` — Update `reopenIssue`:
  - Change param from `issueIdOrNumber: string` to `issueNumber: number`
  - Same where clause pattern

- [x] `src/server/services/issue.ts` — Update `deleteIssue`:
  - Change param from `issueIdOrNumber: string` to `issueNumber: number`
  - Same where clause pattern

- [x] Keep `touchIssue(issueId)` and `updateIssueLastLogPreview(issueId, ...)` as UUID-only — they are internal helpers called with known UUIDs from other services.

### Task 5: Update `requireIssueAccess` to use number

- [x] `src/server/auth/permissions.ts` — Update `requireIssueAccess`:
  - Change param from `issueIdOrNumber: string` to `issueNumber: number`
  - Remove `isUUID` import and `sql` import (no longer needed for this)
  - Replace the `findFirst` where clause: `and(eq(t.number, issueNumber), eq(t.projectId, projectId))`

- [x] `src/server/auth/permissions.ts` — Update `requireIssueLogAccess`, `requireIssueNoteAccess`, `requireIssueTaskAccess`:
  - Change param from `issueIdOrNumber: string` to `issueNumber: number`
  - Pass through to `requireIssueAccess`
  - Child lookups already use `issue.id` (resolved UUID) — no change needed there

### Task 6: Rename API route directory and update handlers

Rename the filesystem directory:

```
src/app/api/projects/[projectId]/issues/[issueId]/
→ src/app/api/projects/[projectId]/issues/[issueNumber]/
```

This affects 9 route files. In each file:

- Change `issueId: string` to `issueNumber: string` in the `RouteContext` params type (it's a string from URL params)
- Parse to number: `const issueNumber = Number(params.issueNumber)`
- Add validation: if `!Number.isInteger(issueNumber) || issueNumber <= 0`, return 400
- Pass `issueNumber` to `requireIssueAccess` and service calls
- For service calls that need the UUID (e.g., task/log/note services that take `issueId`), use `issue.id` from `requireIssueAccess` result

Files to update:

- [x] `.../issues/[issueNumber]/route.ts` — GET, PATCH, DELETE handlers
- [x] `.../issues/[issueNumber]/close/route.ts` — POST, DELETE handlers
- [x] `.../issues/[issueNumber]/tasks/route.ts` — GET, POST handlers
- [x] `.../issues/[issueNumber]/tasks/[taskId]/route.ts` — PATCH, DELETE handlers
- [x] `.../issues/[issueNumber]/tasks/[taskId]/move/route.ts` — POST handler
- [x] `.../issues/[issueNumber]/logs/route.ts` — GET, POST handlers
- [x] `.../issues/[issueNumber]/logs/[logId]/route.ts` — PATCH, DELETE handlers
- [x] `.../issues/[issueNumber]/notes/route.ts` — GET, POST handlers
- [x] `.../issues/[issueNumber]/notes/[noteId]/route.ts` — PATCH, DELETE handlers

**Pattern for each handler** (example from close/route.ts):

```ts
// Before:
const { projectId, issueId } = await context.params
await requireIssueAccess(projectId, issueId)
const result = await closeIssue({ projectId, issueId })

// After:
const { projectId, issueNumber: issueNumberStr } = await context.params
const issueNumber = Number(issueNumberStr)
if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
  return NextResponse.json({ error: 'Invalid issue number' }, { status: 400 })
}
await requireIssueAccess(projectId, issueNumber)
const result = await closeIssue({ projectId, issueNumber })
```

### Task 7: Update `naholo-api` package types

- [x] `packages/naholo-api/src/types.ts` — Add `number: number` to all issue types:
  - `Issue` type (line ~23): add `number: number` field
  - `IssueListItem` type (line ~33): add `number: number` field
  - `IssueDetail` type (line ~44): add `'number'` to the `Pick` union

### Task 8: Update `naholo-api` client to use number

- [x] `packages/naholo-api/src/client.ts` — Update the `issuePath` helper (line ~74):
  - Rename param from `issueId: string` to `issueNumber: number`
  - Path becomes `/issues/${issueNumber}`

- [x] Update all issue methods to take `issueNumber: number` instead of `issueId: string`:
  - `getIssue(projectId, issueNumber)`
  - `updateIssue(projectId, issueNumber, input)`
  - `deleteIssue(projectId, issueNumber)`
  - `closeIssue(projectId, issueNumber)`
  - `reopenIssue(projectId, issueNumber)`

- [x] Update task/note/log methods to take `issueNumber: number`:
  - `listTasks(projectId, issueNumber)`, `createTask(...)`, `updateTask(...)`, `deleteTask(...)`, `moveTask(...)`
  - `listNotes(projectId, issueNumber)`, `createNote(...)`, `updateNote(...)`, `deleteNote(...)`
  - `listLogs(projectId, issueNumber)`, `createLog(...)`, `deleteLog(...)`

### Task 9: Update `createIssueAction` and other server actions

- [x] `src/app/app/actions.ts` — Update `createIssueAction` (line ~96):
  - Change return type from `ReturnResult<{ id: string }>` to `ReturnResult<{ id: string; number: number }>`

- [x] `src/app/app/actions.ts` — Update all other actions that take `issueId`:
  - `createLogAction(projectId, issueId, ...)` → `createLogAction(projectId, issueNumber: number, ...)`
  - `createTaskAction(projectId, issueId, ...)` → `createTaskAction(projectId, issueNumber: number, ...)`
  - `updateTaskAction(projectId, issueId, ...)` → `updateTaskAction(projectId, issueNumber: number, ...)`
  - `setTaskDoneAction(projectId, issueId, ...)` → `setTaskDoneAction(projectId, issueNumber: number, ...)`
  - `deleteTaskAction(projectId, issueId, ...)` → `deleteTaskAction(projectId, issueNumber: number, ...)`
  - Each of these calls `requireIssueAccess(projectId, issueNumber)` and uses `issue.id` (the resolved UUID) for downstream service calls that still need the UUID internally (task/log/note services)

### Task 10: Update frontend routing

- [x] Rename directory:

  ```
  src/app/app/projects/[projectId]/issues/[issueId]/
  → src/app/app/projects/[projectId]/issues/[issueNumber]/
  ```

- [x] `src/app/app/projects/[projectId]/issues/[issueNumber]/page.tsx`:
  - Change `useParams` to extract `issueNumber` (string from URL)
  - Parse to number: `const issueNumber = Number(params.issueNumber)`
  - Pass `issueNumber` to `useIssue`, `useLogs`, `useNotes` hooks

### Task 11: Update frontend hooks to use number

- [x] `src/hooks/use-issues.ts` — Update hooks:
  - `useIssue(projectId, issueNumber: number)` — change API path to use `issueNumber`
  - `useUpdateIssueTitle(projectId, issueNumber: number)` — change API path
  - `useCloseIssue(projectId, issueNumber: number)` — change API path
  - `useReopenIssue(projectId, issueNumber: number)` — change API path
  - `useDeleteIssue(projectId, issueNumber: number)` — change API path
  - Update query keys from `['issue', projectId, issueId]` to `['issue', projectId, issueNumber]`

- [x] `src/hooks/use-tasks.ts` — Update all hooks to take `issueNumber: number`:
  - Change API paths from `/issues/${issueId}/tasks` to `/issues/${issueNumber}/tasks`

- [x] `src/hooks/use-logs.ts` — Update all hooks to take `issueNumber: number`:
  - Change API paths from `/issues/${issueId}/logs` to `/issues/${issueNumber}/logs`

- [x] `src/hooks/use-notes.ts` — Update all hooks to take `issueNumber: number`:
  - Change API paths from `/issues/${issueId}/notes` to `/issues/${issueNumber}/notes`

### Task 12: Update frontend components

- [x] `src/components/issues/issue-item.tsx` — Display `#N` before the title:
  - In the title row, add before the title div:
    ```tsx
    <span className='text-muted-foreground font-normal shrink-0'>
      #{issue.number}
    </span>
    ```
  - Update `handleClick` to navigate to `/app/projects/${projectId}/issues/${issue.number}` instead of `${issue.id}`

- [x] `src/components/issues/issues-list.tsx` — Update search filter to also match by number:

  ```ts
  const query = searchQuery.toLowerCase()
  const matchesTitle = issue.title.toLowerCase().includes(query)
  const matchesNumber = query.startsWith('#')
    ? issue.number.toString().startsWith(query.slice(1))
    : false
  return matchesTitle || matchesNumber
  ```

- [x] `src/components/issues/create-issue-dialog.tsx` — Update navigation after creation:
  - Change `router.push(\`/app/projects/${projectId}/issues/${result.data.id}\`)`to`router.push(\`/app/projects/${projectId}/issues/${result.data.number}\`)`

- [x] `src/components/issues/issue-detail.tsx` — Display `#N` in the header:
  - In the non-editing title display, add number before the title:
    ```tsx
    <h1
      className='cursor-text text-xl font-semibold'
      onClick={() => setIsEditingTitle(true)}
    >
      <span className='text-muted-foreground font-normal'>
        #{issue.number}{' '}
      </span>
      {issue.title}
    </h1>
    ```
  - In the editing state, show number as static prefix before the input
  - Update all hook calls to pass `issueNumber` instead of `issueId` (where `issueNumber` comes from `issue.number`)

### Task 13: Update MCP tools in CLI package

- [x] `packages/naholo-cli/src/mcp/tools.ts` — Update MCP tools that take `issueId`:
  - Rename `issueId` to `issueNumber` with type `z.number()` (instead of `z.string()`)
  - Update descriptions to `'Issue number (e.g. 3)'`
  - Affects: `close_issue`, `create_task`, `update_task`, `create_log`

- [x] `packages/naholo-cli/src/mcp/resources.ts` — Update the `issue` resource template:
  - Change URI template from `naholo://issues/{issueId}` to `naholo://issues/{issueNumber}`
  - Parse `issueNumber` as number from URI variables

### Task 14: Verify

- [x] Run `npx tsc` from the repo root to confirm everything compiles without type errors across the main app, `naholo-api`, and `naholo-cli` packages.

## Post-plan changes

- **`requireIssueAccess` accepts `number | string`**: Changed `issueNumber` param from `number` to `number | string` in `requireIssueAccess` and its child functions (`requireIssueLogAccess`, `requireIssueNoteAccess`, `requireIssueTaskAccess`). The function parses and validates internally, throwing `NotFoundError('Issue')` for invalid values. This eliminated all manual `Number()` parsing and validation boilerplate from the 9 API route files.
- **`requireIssueAccess` returns `issue.number`**: Return type changed from `{ id: string }` to `{ id: string; number: number }` so routes can use the parsed number for service calls.
- **`naholo-api` client accepts `number | string`**: All `issueNumber` params in `client.ts` changed to `number | string`, removing the need for callers to convert.
- **MCP tool schemas**: `issueNumber` in MCP tools uses `z.number().int().positive()` for stricter validation.
- **MCP resources**: Removed `Number()` casts in `resources.ts` — URI template variables are passed as strings directly to client methods.

## Notes

- Issue numbers are monotonically increasing per project and never recycled — deleting issue `#3` does not free up that number.
- The `issueCounter` on projects acts as a high-water mark. It only goes up.
- `touchIssue` and `updateIssueLastLogPreview` remain UUID-only since they are internal helpers always called with resolved UUIDs from other services (task, log, note services).
- The `naholo-api` client's `createIssue` method declares `Promise<Issue>` but the API POST handler only returns `{ id, number }` (a subset). This pre-existing mismatch is out of scope for this plan.
