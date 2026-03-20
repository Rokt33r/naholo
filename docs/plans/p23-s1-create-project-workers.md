# P23-S1: Create Project Workers

Create the `project_workers` table and backfill a worker for each existing project.

## Schema

New file: `src/server/db/schema/project-workers.ts`

```
project_workers
├── id          uuid (pk, defaultRandom)
├── projectId   uuid (fk → projects.id, cascade)
├── userId      uuid (fk → users.id, nullable, set null on delete)
├── type        text (not null, default 'user')  — 'user' | 'bot'
├── name        text (not null)
├── role        text (not null, default 'member') — 'admin' | 'member'
└── createdAt   timestamp (defaultNow)
```

Export from `src/server/db/schema/index.ts`.

## Migration Backfill

After `db:generate`, append to the generated SQL:

```sql
-- Backfill: create an admin worker for each existing project owner
INSERT INTO project_workers (id, project_id, user_id, type, name, role, created_at)
SELECT
  gen_random_uuid(),
  p.id,
  p.user_id,
  'user',
  u.name,
  'admin',
  p.created_at
FROM projects p
JOIN users u ON u.id = p.user_id;
```

This ensures every existing project has at least one admin worker.

## Tasks

- [x] Create `project_workers` schema file
- [x] Export from schema index
- [x] User runs `db:generate`
- [x] Append backfill SQL to migration
- [x] User runs `db:migrate`
