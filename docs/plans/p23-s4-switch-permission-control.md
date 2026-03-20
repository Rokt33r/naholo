# P23-S4: Switch Permission Control

Update all services and API routes to use `projectWorkerId` instead of `userId` for permission scoping.

## Auth Flow Change

Current:

```
API route → getAuthUser() → userId → service(userId, ...)
```

New:

```
API route → requireProjectWorker(projectId) → { userId, projectWorkerId } → service(projectWorkerId, ...)
```

`requireProjectWorker` in `src/server/auth/utils.ts` handles auth + worker lookup in one step, throwing on unauthorized or non-member access.

## Service Changes

All services currently accept `userId` as first param. Replace with `projectWorkerId`.

Two types of changes inside each function:

1. **Where clauses** (permission scoping): `eq(table.userId, userId)` → `eq(table.projectWorkerId, projectWorkerId)`. Also applies to cross-table lookups (e.g. `createTask` validates parent issue via `eq(issues.projectWorkerId, projectWorkerId)`).
2. **Insert values** (authorship): `userId` in insert data → `projectWorkerId`.

Services to update:

- `src/server/services/issue.ts` — `getIssue`, `listIssues`, `createIssue`, `updateIssue`, `closeIssue`, `reopenIssue`, `deleteIssue`
- `src/server/services/task.ts` — `listTasks`, `createTask`, `updateTask`, `setTaskDone`, `updateTaskNote`, `deleteTask`, `moveTask`
- `src/server/services/note.ts` — `listNotes`, `createNote`, `updateNote`, `deleteNote`
- `src/server/services/log.ts` — `listLogs`, `createLog`, `updateLog`, `deleteLog`

## API Route Changes

All API routes under `/api/projects/[projectId]/...` need to:

1. Call `requireProjectWorker(projectId)` to get `{ userId, projectWorkerId }`
2. Pass `projectWorkerId` to services instead of `userId`

## Tasks

- [x] Create `requireProjectWorker` in `src/server/auth/utils.ts`
- [x] Update issue service to use `projectWorkerId`
- [x] Update task service to use `projectWorkerId`
- [x] Update note service to use `projectWorkerId`
- [x] Update log service to use `projectWorkerId`
- [x] Update all API routes to use `requireProjectWorker`
- [x] Type-check with `npx tsc`
