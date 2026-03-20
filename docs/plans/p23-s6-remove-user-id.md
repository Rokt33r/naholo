# P23-S6: Remove userId from Entities

Drop the now-unused `userId` column from project-scoped entities.

## Schema Changes

Remove `userId` column from:

- `issues`
- `tasks`
- `notes`
- `logs`

The `userId` on `projects` table stays — it tracks the original creator/owner.

## Pre-check

Before this step, verify:

- No service code references `userId` on issues/tasks/notes/logs
- No API route passes `userId` to services
- All queries use `projectWorkerId`

## Tasks

- [x] Remove `userId` from issues, tasks, notes, logs schemas
- [x] User runs `db:generate`
- [x] User runs `db:migrate`
- [x] Verify `npx tsc` passes
- [x] Smoke test the app
