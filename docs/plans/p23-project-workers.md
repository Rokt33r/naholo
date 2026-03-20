# P23: Project Workers

## Goal

Introduce project workers as the identity layer for project-scoped actions. Replace direct `userId` references on project entities (issues, tasks, notes, logs) with `projectWorkerId`, enabling:

- Bots as first-class project members (no user account needed)
- Multi-user collaboration via project invites
- Role-based permission control (admin vs member)

## Current State

- All entities (issues, tasks, notes, logs) have a `userId` column referencing the `users` table directly
- Permission checks in services use `userId` to scope queries
- The app is effectively single-user per project — the project creator owns everything

## Schema: `project_workers`

| Column    | Type       | Notes                                                  |
| --------- | ---------- | ------------------------------------------------------ |
| id        | uuid (pk)  | defaultRandom                                          |
| projectId | uuid (fk)  | references projects.id, cascade                        |
| userId    | uuid (fk)? | references users.id, nullable, set null on user delete |
| type      | text       | `'user'` or `'bot'`                                    |
| name      | text       | display name (for bots; users can override or inherit) |
| role      | text       | `'admin'` or `'member'`                                |
| createdAt | timestamp  | defaultNow                                             |

- `type: 'user'` workers have `userId` set — linked to an actual account
- `type: 'bot'` workers have `userId` null — standalone project member
- When a user deletes their account, `userId` becomes null (set null) but the worker record and their authored content remain
- The project creator is automatically an `admin` worker
- `admin` can manage members (invite, remove, change role)
- `member` can create/edit their own issues, logs, tasks, notes

## Migration Strategy

The migration replaces `userId` on project entities with `projectWorkerId` in 5 phases. Each phase is a separate step with its own schema edits and migration script.

**Important workflow for Phase 1 and Phase 2:**

1. Edit schemas in code
2. User runs `db:generate` to auto-generate migration SQL
3. Append extra SQL queries to the generated migration file (for data backfill)

## Steps

1. **[Create Project Workers](p23-s1-create-project-workers.md)** — Schema + backfill workers for existing projects
2. **[Add projectWorkerId to Entities](p23-s2-add-project-worker-id.md)** — Add column to issues/tasks/notes/logs + backfill
3. **[Set Worker on Create](p23-s3-set-worker-on-create.md)** — Update insert queries to populate projectWorkerId
4. **[Switch Permission Control](p23-s4-switch-permission-control.md)** — Update services to use projectWorkerId
5. **[Remove userId from Entities](p23-s5-remove-user-id.md)** — Drop old userId columns
