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

-- Make columns not null after backfill
ALTER TABLE issues ALTER COLUMN project_worker_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN project_worker_id SET NOT NULL;
ALTER TABLE notes ALTER COLUMN project_worker_id SET NOT NULL;
ALTER TABLE logs ALTER COLUMN project_worker_id SET NOT NULL;
```

## Tasks

- [ ] Add `projectWorkerId` (nullable) to issues, tasks, notes, logs schemas
- [ ] User runs `db:generate`
- [ ] Append backfill + `SET NOT NULL` SQL to migration
- [ ] User runs `db:migrate`
- [ ] Update schemas to mark `projectWorkerId` as `notNull` (matches DB state)
