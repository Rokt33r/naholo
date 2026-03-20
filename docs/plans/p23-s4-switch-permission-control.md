# P23-S4: Switch Permission Control

Update all services and API routes to use `projectWorkerId` instead of `userId` for permission scoping.

## Auth Flow Change

Current:

```
API route → getAuthUser() → userId → service(userId, ...)
```

New:

```
API route → getAuthUser() → userId → resolve projectWorkerId for this project → service(projectWorkerId, ...)
```

Need a helper to resolve the current user's worker for a given project:

```ts
async function getProjectWorker(
  userId: string,
  projectId: string,
): Promise<ProjectWorker | null>
```

This lookup can live in a `project-worker` service.

## Service Changes

All services currently accept `userId` as first param. Replace with `projectWorkerId`:

- `src/server/services/issue.ts` — list/create/update/delete scoped by worker
- `src/server/services/task.ts` — same
- `src/server/services/note.ts` — same
- `src/server/services/log.ts` — same
- `src/server/services/project.ts` — project-level operations check worker role

## Permission Rules

| Action                                       | Required Role                        |
| -------------------------------------------- | ------------------------------------ |
| Create issue, task, note, log                | `member` or `admin`                  |
| Edit/delete own entities                     | `member` or `admin` (must be author) |
| Edit/delete others' entities                 | `admin` only                         |
| Manage workers (invite, remove, role change) | `admin` only                         |
| View project content                         | `member` or `admin`                  |

## API Route Changes

All API routes under `/api/projects/[projectId]/...` need to:

1. Get `userId` from `getAuthUser()`
2. Resolve `projectWorkerId` via the project-worker service
3. Return 403 if no worker found for this project
4. Pass `projectWorkerId` to services

## Tasks

- [ ] Create `project-worker` service (getWorkerForUser, listWorkers, inviteWorker, removeWorker)
- [ ] Update issue service to use `projectWorkerId`
- [ ] Update task service to use `projectWorkerId`
- [ ] Update note service to use `projectWorkerId`
- [ ] Update log service to use `projectWorkerId`
- [ ] Update project service for role-based access
- [ ] Update all API routes to resolve worker before calling services
- [ ] Update React Query hooks if response shapes change
- [ ] Test all CRUD operations still work
