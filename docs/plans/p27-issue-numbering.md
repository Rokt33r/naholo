# P27: Issue Numbering

## Goal

Add per-project sequential issue numbers (like GitHub's `#1`, `#2`, etc.) so issues can be easily identified and referenced. Each project maintains its own counter, and numbers are never reused even if an issue is deleted. API routes and services accept either UUID or issue number.

## Prerequisites

None.

## Architecture Decisions

- **Counter on projects table**: Add an `issueCounter` (integer, default 0) column to the `projects` table. On each issue creation, atomically increment the counter and assign the new value as the issue's `number`. This avoids race conditions via a single `UPDATE ... RETURNING` statement inside a transaction.
- **Number on issues table**: Add a `number` (integer, NOT NULL) column to the `issues` table. Add a unique index on `(projectId, number)` to enforce uniqueness per project.
- **Display format**: Show as `#N` prefix before the issue title in lists and detail headers (e.g., `#3 Fix login bug`).
- **API accepts UUID or number**: Route path becomes `[issueIdOrNumber]`. A `resolveIssueId(projectId, issueIdOrNumber)` helper detects format (UUID regex vs numeric string) and resolves to the UUID. This is used by `requireIssueAccess` and service functions.
- **UUID detection**: Use regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` to distinguish UUID from number. Anything else that parses as a positive integer is treated as a number.
- **Search by number**: Extend the client-side search in the issues list to also match `#N` patterns.

## Tasks

### Task 1: Add `issueCounter` to projects schema

- [x] `src/server/db/schema/projects.ts` — Add `issueCounter` column:
  - Import `integer` from `drizzle-orm/pg-core` (add to existing import)
  - Add column: `issueCounter: integer('issue_counter').notNull().default(0)`

### Task 2: Add `number` to issues schema

- [x] `src/server/db/schema/issues.ts` — Add `number` column and unique index:
  - Import `integer` and `uniqueIndex` from `drizzle-orm/pg-core` (add to existing import)
  - Add column: `number: integer('number').notNull()`
  - Add unique index as third argument to `pgTable`:
    ```
    (table) => [uniqueIndex('issues_project_id_number_idx').on(table.projectId, table.number)]
    ```

### Task 3: Add `isUUID` utility and `issueWhere` helper

- [x] `src/lib/utils.ts` — Add a shared `isUUID` function:

  ```ts
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  export function isUUID(value: string): boolean {
    return UUID_RE.test(value)
  }
  ```

- [x] `src/server/services/issue.ts` — Add an `issueWhere` helper that builds the WHERE clause to match by UUID or number in a single query (no separate resolution step):

  ```ts
  import { isUUID } from '@/lib/utils'

  function issueWhere(projectId: string, issueIdOrNumber: string) {
    if (isUUID(issueIdOrNumber)) {
      return and(
        eq(issues.id, issueIdOrNumber),
        eq(issues.projectId, projectId),
      )
    }
    const num = Number(issueIdOrNumber)
    if (!Number.isInteger(num) || num <= 0) {
      return undefined
    }
    return and(eq(issues.number, num), eq(issues.projectId, projectId))
  }
  ```

  - Returns a Drizzle `SQL` condition or `undefined` if the input is invalid. Each service function uses this directly in its own query — no extra round trip.

### Task 4: Assign number atomically on issue creation

- [x] `src/server/services/issue.ts` — Update `createIssue` function (line ~96):
  - Import `projects` from `../db/schema` (currently only imports `issues` and `tasks`)
  - `sql` is already imported from `drizzle-orm`
  - Wrap the insert in `db.transaction()`:
    1. Increment `projects.issueCounter` by 1 and return the new value:
       ```ts
       const [{ issueCounter }] = await tx
         .update(projects)
         .set({ issueCounter: sql`${projects.issueCounter} + 1` })
         .where(eq(projects.id, data.projectId))
         .returning({ issueCounter: projects.issueCounter })
       ```
    2. Insert the issue with `number: issueCounter`
    3. Return `ok({ id: issue.id, number: issueCounter })`
  - Update return type from `ReturnResult<{ id: string }>` to `ReturnResult<{ id: string; number: number }>`

### Task 5: Update service functions to accept UUID or number

All service functions replace their hand-written `where(and(eq(issues.id, ...), eq(issues.projectId, ...)))` with `issueWhere(projectId, issueIdOrNumber)`. This means each function does a single query — no separate resolution.

- [x] `src/server/services/issue.ts` — Update `getIssue` (line ~34):
  - Change param from `issueId` to `issueIdOrNumber`
  - Replace `.where(and(eq(issues.id, data.issueId), eq(issues.projectId, data.projectId)))` with `.where(issueWhere(data.projectId, data.issueIdOrNumber))` — if `issueWhere` returns `undefined` (invalid input), return `null`
  - Add `number: issues.number` to the select fields
  - Update the `Issue` type (line ~9) to include `number: number`

- [x] `src/server/services/issue.ts` — Update `listIssues` (line ~60):
  - Add `number: issues.number` to the select fields
  - Update the `IssueWithStats` type (line ~19) to include `number: number`
  - (No `issueId` param here — no change to where clause)

- [x] `src/server/services/issue.ts` — Update `updateIssue` (line ~116):
  - Change param from `issueId` to `issueIdOrNumber`
  - Replace `.where(...)` with `.where(issueWhere(...))` — if `undefined`, return `err(new NotFoundError('Issue'))`

- [x] `src/server/services/issue.ts` — Update `closeIssue` (line ~142):
  - Change param from `issueId` to `issueIdOrNumber`
  - Replace `.where(...)` with `.where(issueWhere(...))`

- [x] `src/server/services/issue.ts` — Update `reopenIssue` (line ~168):
  - Change param from `issueId` to `issueIdOrNumber`
  - Replace `.where(...)` with `.where(issueWhere(...))`

- [x] `src/server/services/issue.ts` — Update `deleteIssue` (line ~194):
  - Change param from `issueId` to `issueIdOrNumber`
  - Replace `.where(...)` with `.where(issueWhere(...))`

- [x] Keep `touchIssue(issueId)` and `updateIssueLastLogPreview(issueId, ...)` as UUID-only — they are internal helpers called with known UUIDs from other services.

### Task 6: Update `requireIssueAccess` to accept UUID or number

- [x] `src/server/auth/permissions.ts` — Update `requireIssueAccess` (line ~284):
  - Rename param from `issueId` to `issueIdOrNumber`
  - Import `isUUID` from `@/lib/utils`
  - Replace the `findFirst` where clause to handle both formats in a single query:
    ```ts
    where: (t, { eq, and }) => {
      if (isUUID(issueIdOrNumber)) {
        return and(eq(t.id, issueIdOrNumber), eq(t.projectId, projectId))
      }
      const num = Number(issueIdOrNumber)
      if (!Number.isInteger(num) || num <= 0) {
        return sql`false`
      }
      return and(eq(t.number, num), eq(t.projectId, projectId))
    }
    ```
  - Import `sql` from `drizzle-orm` if not already imported
  - Return type stays `{ projectWorker: ProjectWorker; issue: { id: string } }`

- [x] `src/server/auth/permissions.ts` — Update `requireIssueLogAccess` (line ~306), `requireIssueNoteAccess` (line ~332), `requireIssueTaskAccess` (line ~358):
  - Rename param from `issueId` to `issueIdOrNumber`
  - These call `requireIssueAccess` internally, so they just pass through the new param name

### Task 7: Rename route directory and update all route handlers

Rename the filesystem directory:

```
src/app/api/projects/[projectId]/issues/[issueId]/
→ src/app/api/projects/[projectId]/issues/[issueIdOrNumber]/
```

This affects 9 route files. In each file:

- Change `issueId: string` to `issueIdOrNumber: string` in the `RouteContext` params type
- Change `const { projectId, issueId } = await context.params` to `const { projectId, issueIdOrNumber } = await context.params`
- Pass `issueIdOrNumber` to `requireIssueAccess` / `requireIssueLogAccess` / etc.
- For service calls that previously took `issueId`, use the resolved `issue.id` from `requireIssueAccess` result instead

Files to update:

- [ ] `.../issues/[issueIdOrNumber]/route.ts` — GET, PATCH, DELETE handlers. Use `issue.id` from `requireIssueAccess` for `getIssue({ issueIdOrNumber })` and service calls.
- [ ] `.../issues/[issueIdOrNumber]/close/route.ts` — POST, DELETE handlers
- [ ] `.../issues/[issueIdOrNumber]/tasks/route.ts` — GET, POST handlers
- [ ] `.../issues/[issueIdOrNumber]/tasks/[taskId]/route.ts` — PATCH, DELETE handlers
- [ ] `.../issues/[issueIdOrNumber]/tasks/[taskId]/move/route.ts` — POST handler
- [ ] `.../issues/[issueIdOrNumber]/logs/route.ts` — GET, POST handlers
- [ ] `.../issues/[issueIdOrNumber]/logs/[logId]/route.ts` — PATCH, DELETE handlers
- [ ] `.../issues/[issueIdOrNumber]/notes/route.ts` — GET, POST handlers
- [ ] `.../issues/[issueIdOrNumber]/notes/[noteId]/route.ts` — PATCH, DELETE handlers

**Pattern for each handler** (example from close/route.ts):

```ts
// Before:
const { projectId, issueId } = await context.params
await requireIssueAccess(projectId, issueId)
const result = await closeIssue({ projectId, issueId })

// After:
const { projectId, issueIdOrNumber } = await context.params
await requireIssueAccess(projectId, issueIdOrNumber)
const result = await closeIssue({ projectId, issueIdOrNumber })
```

Both `requireIssueAccess` and the service function resolve UUID/number in their own single query — no extra round trip. The permission check and the service operation are separate queries regardless (one for auth, one for the mutation).

### Task 8: Update `naholo-api` package types

- [ ] `packages/naholo-api/src/types.ts` — Add `number: number` to all issue types:
  - `Issue` type (line ~23): add `number: number` field
  - `IssueListItem` type (line ~33): add `number: number` field
  - `IssueDetail` type (line ~44): add `'number'` to the `Pick` union

### Task 9: Update `naholo-api` client to accept UUID or number

- [ ] `packages/naholo-api/src/client.ts` — Update all issue methods to accept `issueIdOrNumber: string`:
  - `getIssue(projectId, issueIdOrNumber)` (line ~125)
  - `updateIssue(projectId, issueIdOrNumber, input)` (line ~132)
  - `deleteIssue(projectId, issueIdOrNumber)` (line ~141)
  - `closeIssue(projectId, issueIdOrNumber)` (line ~145)
  - `reopenIssue(projectId, issueIdOrNumber)` (line ~149)
  - Update the `issuePath` helper (line ~74): rename param from `issueId` to `issueIdOrNumber`
  - `createIssue` stays unchanged (no issueId param)

- [ ] Also update task/note/log methods that take `issueId` to accept `issueIdOrNumber`:
  - `listTasks(projectId, issueIdOrNumber)` (line ~155)
  - `createTask(projectId, issueIdOrNumber, input)` (line ~159)
  - `updateTask(projectId, issueIdOrNumber, taskId, input)` (line ~171)
  - `deleteTask(projectId, issueIdOrNumber, taskId)` (line ~188)
  - `moveTask(projectId, issueIdOrNumber, taskId, input)` (line ~196)
  - `listNotes(projectId, issueIdOrNumber)` (line ~210)
  - `createNote(projectId, issueIdOrNumber, input)` (line ~214)
  - `updateNote(projectId, issueIdOrNumber, noteId, input)` (line ~229)
  - `deleteNote(projectId, issueIdOrNumber, noteId)` (line ~239)
  - `listLogs(projectId, issueIdOrNumber)` (line ~252)
  - `createLog(projectId, issueIdOrNumber, input)` (line ~256)
  - `deleteLog(projectId, issueIdOrNumber, logId)` (line ~268)

### Task 10: Update `createIssueAction` return type

- [ ] `src/app/app/actions.ts` — Update `createIssueAction` (line ~96):
  - Change return type from `ReturnResult<{ id: string }>` to `ReturnResult<{ id: string; number: number }>`
  - The service already returns `{ id, number }` after Task 4, so just update the type annotation

### Task 11: Update MCP tools in CLI package

- [ ] `packages/naholo-cli/src/mcp/tools.ts` — Update MCP tools that take `issueId` to document they accept number too:
  - `close_issue` tool (line ~24): update `issueId` schema description to `'Issue ID (UUID or number)'`
  - `create_task` tool (line ~37): update `issueId` schema description to `'Issue ID (UUID or number)'`
  - `update_task` tool (line ~64): update `issueId` schema description to `'Issue ID (UUID or number)'`
  - `create_log` tool (line ~86): update `issueId` schema description to `'Issue ID (UUID or number)'`
  - The tools already pass through to `client.*` methods which will accept either format after Task 9. No logic change needed, just description updates.

- [ ] `packages/naholo-cli/src/mcp/resources.ts` — The `issue` resource template (line ~49) uses `issueId` from URI variables and passes to `client.getIssue()`. Since the client will accept either format, no change needed. The resource URI template `naholo://issues/{issueId}` can stay as-is.

### Task 12: Display issue number in the issues list

- [ ] `src/components/issues/issue-item.tsx` — Display `#N` before the title (line ~45):
  - The component already receives `issue: IssueListItem` which will have `number` after Task 8
  - In the title row (line ~45), replace `<div className='truncate font-bold'>{issue.title}</div>` with:
    ```tsx
    <span className='text-muted-foreground font-normal shrink-0'>#{issue.number}</span>
    <div className='truncate font-bold'>{issue.title}</div>
    ```
- [ ] `src/components/issues/issues-list.tsx` — Update search filter (line ~47) to also match by number:
  - Current filter: `issue.title.toLowerCase().includes(searchQuery.toLowerCase())`
  - Add number matching:
    ```ts
    const query = searchQuery.toLowerCase()
    const matchesTitle = issue.title.toLowerCase().includes(query)
    const numberStr = issue.number.toString()
    const matchesNumber = query.startsWith('#')
      ? numberStr.startsWith(query.slice(1))
      : false
    return matchesTitle || matchesNumber
    ```

### Task 13: Display issue number in the issue detail header

- [ ] `src/components/issues/issue-detail.tsx` — Display `#N` in the header:
  - The component uses `useIssue()` which returns `IssueDetail` — this type will include `number` after Task 8
  - In the non-editing title display (line ~200-211), add the number before the title in the `<h1>` element:
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
  - In the editing state (line ~183-197), show the number as a static prefix before the input (not editable):
    ```tsx
    <div className='flex items-center gap-1'>
      <span className='text-xl text-muted-foreground'>#{issue.number}</span>
      <input ... />
    </div>
    ```

### Task 14: Verify

- [ ] Run `npx tsc` from the repo root to confirm everything compiles without type errors across the main app, `naholo-api`, and `naholo-cli` packages.

## Notes

- Issue numbers are monotonically increasing per project and never recycled — deleting issue `#3` does not free up that number.
- The `issueCounter` on projects acts as a high-water mark. It only goes up.
- Existing issues in the database will need a one-time migration to backfill numbers. This is left to the user (do NOT generate migration files). A simple approach: for each project, assign numbers ordered by `createdAt`.
- The `naholo-api` client's `createIssue` method declares `Promise<Issue>` but the API POST handler only returns `{ id, number }` (a subset). This pre-existing mismatch is out of scope for this plan.
- After schema changes, the user will run `db:generate` and `db:migrate` manually.
- `touchIssue` and `updateIssueLastLogPreview` remain UUID-only since they are internal helpers always called with resolved UUIDs.
- Frontend routes (`/app/projects/[projectId]/issues/[issueId]`) stay UUID-based — number-based routing is API-only.
