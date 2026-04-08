# P27: Issue Numbering

## Goal

Add per-project sequential issue numbers (like GitHub's `#1`, `#2`, etc.) so issues can be easily identified and referenced. Each project maintains its own counter, and numbers are never reused even if an issue is deleted.

## Prerequisites

None.

## Architecture Decisions

- **Counter on projects table**: Add an `issueCounter` (integer, default 0) column to the `projects` table. On each issue creation, atomically increment the counter and assign the new value as the issue's `number`. This avoids race conditions via a single `UPDATE ... RETURNING` statement.
- **Number on issues table**: Add a `number` (integer, NOT NULL) column to the `issues` table. Add a unique constraint on `(projectId, number)` to enforce uniqueness per project.
- **Display format**: Show as `#N` prefix before the issue title in lists and detail headers (e.g., `#3 Fix login bug`).
- **URL routing stays UUID-based**: Keep `[issueId]` (UUID) in URLs. Number is display-only — no routing changes needed.
- **Search by number**: Extend the client-side search in the issues list to also match `#N` patterns.

## Tasks

### Task 1: Add `issueCounter` to projects schema

- [ ] `src/server/db/schema/projects.ts` — Add `issueCounter` column:
  - `issueCounter: integer('issue_counter').notNull().default(0)`
  - Import `integer` from `drizzle-orm/pg-core`

### Task 2: Add `number` to issues schema

- [ ] `src/server/db/schema/issues.ts` — Add `number` column:
  - `number: integer('number').notNull()`
  - Import `integer` from `drizzle-orm/pg-core`
  - Add a unique index on `(projectId, number)` using Drizzle's `unique()` constraint or a separate index. Use: `.unique('issues_project_id_number_unique', [issues.projectId, issues.number])` — or use `pgTable`'s third argument for composite unique. Preferred approach: add `(table) => [uniqueIndex('issues_project_id_number_idx').on(table.projectId, table.number)]` as the third argument to `pgTable`. Import `uniqueIndex` from `drizzle-orm/pg-core`.

### Task 3: Assign number atomically on issue creation

- [ ] `src/server/services/issue.ts` — Update `createIssue` to:
  1. Use `db.transaction()` to wrap both operations
  2. Inside the transaction: increment `projects.issueCounter` by 1 and return the new value:
     ```
     db.update(projects).set({ issueCounter: sql`${projects.issueCounter} + 1` }).where(eq(projects.id, data.projectId)).returning({ issueCounter: projects.issueCounter })
     ```
  3. Insert the issue with `number` set to the returned counter value
  4. Return `{ id, number }` instead of just `{ id }`
  - Import `projects` from the schema and `sql` from `drizzle-orm`

### Task 4: Include `number` in issue queries

- [ ] `src/server/services/issue.ts` — Update `getIssue`:
  - Add `number: issues.number` to the select fields
  - Update the `Issue` type to include `number: number`
- [ ] `src/server/services/issue.ts` — Update `listIssues`:
  - Add `number: issues.number` to the select fields
  - Update the `IssueWithStats` type to include `number: number`

### Task 5: Include `number` in API responses

- [ ] `src/app/api/projects/[projectId]/issues/route.ts` — The GET handler already returns `listIssues()` result directly, so `number` will be included automatically once the service is updated. The POST handler should return `{ id, number }` — update the `createIssue` call response accordingly.
- [ ] `src/app/api/projects/[projectId]/issues/[issueId]/route.ts` — The GET handler already returns `getIssue()` result, so `number` will be included automatically.

### Task 6: Update `createIssueAction` to return `number`

- [ ] `src/app/app/actions.ts` — Update `createIssueAction` return type from `ReturnResult<{ id: string }>` to `ReturnResult<{ id: string; number: number }>`. Pass through the `number` from the service result.

### Task 7: Update frontend types in hooks

- [ ] `src/hooks/use-issues.ts` — Add `number: number` to:
  - `Issue` type
  - `IssueListItem` Pick (add `'number'`)
  - `IssueDetail` Pick (add `'number'`)

### Task 8: Display issue number in the issues list

- [ ] `src/components/issues/issue-item.tsx` — Add `number: number` to the `Issue` type. Display `#{issue.number}` before the title in the title row:
  - Add a `<span className='text-muted-foreground font-normal'>#{issue.number}</span>` before the title `<div>` inside the flex container
- [ ] `src/components/issues/issues-list.tsx` — Update client-side search to also match by number: check if `searchQuery` matches `#N` pattern or if `issue.number.toString()` includes the numeric part

### Task 9: Display issue number in the issue detail header

- [ ] `src/components/issues/issue-detail.tsx` — Add `number: number` to the local `IssueDetail` type. Display `#N` before the title in the non-editing state:
  - In the `<h1>` element (line ~224), prepend `<span className='text-muted-foreground'>#{issue.number}</span>` before `{issue.title}`
  - When editing title, the number should not be editable — keep it as a static prefix before the input

## Notes

- Issue numbers are monotonically increasing per project and never recycled — deleting issue `#3` does not free up that number.
- The `issueCounter` on projects acts as a high-water mark. It only goes up.
- Existing issues in the database will need a one-time migration to backfill numbers. This is left to the user (do NOT generate migration files). A simple approach: for each project, assign numbers ordered by `createdAt`.
