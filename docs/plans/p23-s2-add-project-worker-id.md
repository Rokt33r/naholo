# P23-S2: Add projectWorkerId to Entities

Add a `projectWorkerId` column to all project-scoped entities and backfill from existing `userId`.

## Schema Changes

Add to each table:

| Table  | New Column      | Type      | Notes                                  |
| ------ | --------------- | --------- | -------------------------------------- |
| issues | projectWorkerId | uuid (fk) | references project_workers.id, cascade |
| tasks  | projectWorkerId | uuid (fk) | references project_workers.id, cascade |
| notes  | projectWorkerId | uuid (fk) | references project_workers.id, cascade |
| logs   | projectWorkerId | uuid (fk) | references project_workers.id, cascade |

Initially add as **nullable** so the migration can populate them.

## Migration Backfill

After `db:generate`, append to the generated SQL:

```sql
-- Backfill: set projectWorkerId from existing userId + projectId
UPDATE issues i
SET project_worker_id = pw.id
FROM project_workers pw
WHERE pw.project_id = i.project_id AND pw.user_id = i.user_id;

UPDATE tasks t
SET project_worker_id = pw.id
FROM project_workers pw
WHERE pw.project_id = t.project_id AND pw.user_id = t.user_id;

UPDATE notes n
SET project_worker_id = pw.id
FROM project_workers pw
WHERE pw.project_id = n.project_id AND pw.user_id = n.user_id;

UPDATE logs l
SET project_worker_id = pw.id
FROM project_workers pw
WHERE pw.project_id = l.project_id AND pw.user_id = l.user_id;
```

## Tasks

- [x] Add `projectWorkerId` (nullable) to issues, tasks, notes, logs schemas
- [x] User runs `db:generate`
- [x] Append backfill SQL to migration
- [x] User runs `db:migrate`
