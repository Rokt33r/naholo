# P23-S3: Set projectWorkerId on Entity Creation

Update services and API routes/actions so `projectWorkerId` is passed from the API layer and set on insert.

## Context

After S2, `projectWorkerId` exists on all entities and is backfilled for existing rows. But the create functions in services still only set `userId`. New rows would have `projectWorkerId = null`, which will break once we mark the column `notNull()`.

## Approach

Use `requireProjectWorker(projectId)` in API routes and server actions. It wraps `getAuthUser()` + `getProjectWorkerIdByUserId()` and throws if not authenticated or not a project worker. Returns `{ userId, projectWorkerId }`.

API routes and server actions replace:

```ts
const user = await getAuthUser()
if (!user) {
  /* 401 */
}
```

with:

```ts
const { userId, projectWorkerId } = await requireProjectWorker(projectId)
```

Throws `Error('Unauthorized')` if not authenticated, `Error('Forbidden')` if not a project worker. Callers catch in their existing try/catch.

Services accept `projectWorkerId` in their input types and set it on insert.

### Service Changes

All create functions add `projectWorkerId` to their input type and include it in the insert:

| Service | Function    | Input Change                                |
| ------- | ----------- | ------------------------------------------- |
| issue   | createIssue | add `projectWorkerId` to `CreateIssueInput` |
| task    | createTask  | add `projectWorkerId` to `CreateTaskInput`  |
| note    | createNote  | add `projectWorkerId` to `CreateNoteInput`  |
| log     | createLog   | add `projectWorkerId` to `CreateLogInput`   |

### API Layer Changes

Each API route / server action that calls a create function must use `requireProjectWorker` and pass `projectWorkerId` to the service:

| Caller              | File                                                               |
| ------------------- | ------------------------------------------------------------------ |
| `createIssueAction` | `src/app/app/actions.ts`                                           |
| `createLogAction`   | `src/app/app/actions.ts`                                           |
| `createTaskAction`  | `src/app/app/actions.ts`                                           |
| POST tasks          | `src/app/api/projects/[projectId]/issues/[issueId]/tasks/route.ts` |
| POST notes          | `src/app/api/projects/[projectId]/issues/[issueId]/notes/route.ts` |
| POST logs           | `src/app/api/projects/[projectId]/issues/[issueId]/logs/route.ts`  |

## Already Done

- [x] `getProjectWorkerIdByUserId` helper in `src/server/services/project-worker.ts`
- [x] `requireProjectWorker` in `src/server/auth/utils.ts`

## Tasks

- [x] Update `CreateIssueInput`, `CreateTaskInput`, `CreateNoteInput`, `CreateLogInput` to include `projectWorkerId`
- [x] Update service insert queries to set `projectWorkerId`
- [x] Update `createIssueAction`, `createLogAction`, `createTaskAction` to use `requireProjectWorker`
- [x] Update POST tasks route to use `requireProjectWorker`
- [x] Update POST notes route to use `requireProjectWorker`
- [x] Update POST logs route to use `requireProjectWorker`
- [x] Verify `npx tsc` passes
