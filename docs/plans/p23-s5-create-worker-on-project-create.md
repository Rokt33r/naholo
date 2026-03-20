# P23-S5: Create Worker on Project Create

`createProject` doesn't create a project worker for the creator. After S4 switched permission control to `projectWorkerId`, the creator can't access their own project.

## Problem

1. User creates a project via `createProject(userId, { name })`
2. No `project_workers` row is created for that user
3. `requireProjectWorker(projectId)` throws `Forbidden` on every subsequent request

## Fix

After creating the project in `createProjectAction`, call `createProjectWorker` from the new project-worker service to insert an admin worker row.

## Tasks

- [x] Create `src/server/services/project-worker.ts` with `createProjectWorker` and `getProjectWorkerByUserId`
- [x] Update `createProjectAction` in `src/app/app/actions.ts` to call `createProjectWorker` after project creation
- [x] Verify with `npx tsc`
