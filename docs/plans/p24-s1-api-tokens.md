# P24-S1: API Tokens

Add token-based auth so external tools can call Naholo APIs without a browser session.

Tokens are scoped to a **project worker**, not a user. This means:

- Each token grants access to exactly one project as a specific worker
- A bot worker gets its own token — the token _is_ the bot's identity
- A human user can also generate a token for their own worker in a project (for scripting)
- Revoking a token doesn't affect the user's session or other projects

## Schema: `project_worker_api_tokens`

| Column          | Type       | Notes                                           |
| --------------- | ---------- | ----------------------------------------------- |
| id              | uuid (pk)  | defaultRandom                                   |
| projectWorkerId | uuid (fk)  | references project_workers.id, cascade          |
| name            | text       | user-provided label (e.g. "Claude Code")        |
| tokenHash       | text       | SHA-256 hash of the token                       |
| tokenHint       | text       | first 8 chars for display (e.g. "naholo_ab...") |
| lastUsedAt      | timestamp? | updated on each API call                        |
| createdAt       | timestamp  | defaultNow                                      |

- Token format: `naholo_<random 40 chars>` — shown once at creation, stored as hash only
- No token retrieval after creation — user must regenerate if lost

## Auth Flow

`requireProjectWorker(projectId)` in `src/server/auth/utils.ts` is the single entry point. It checks Bearer token first, then falls back to session auth, and returns `{ projectWorker: ProjectWorker }`. All project-scoped routes use this function.

Internally it delegates to two private helpers:
- `requireProjectWorkerByApiToken(projectId, token)` — calls service to resolve token → worker, validates projectId match, touches lastUsedAt
- `requireProjectWorkerBySession(projectId)` — calls `getAuthUser()` then service to resolve user+project → worker

### Service layer (extracted from auth)

DB queries are in the service layer, not in auth utils:

- `resolveProjectWorkerByApiToken(token)` in `project-worker-api-token` service — hashes token, queries `project_worker_api_tokens` with `projectWorker` relation, returns `{ projectWorker, tokenId } | null`
- `touchProjectWorkerApiToken(tokenId)` in `project-worker-api-token` service — fire-and-forget `lastUsedAt` update
- `resolveProjectWorkerByUserIdAndProjectId(userId, projectId)` in `project-worker` service — returns `ProjectWorker | null`

### `ProjectWorker` type

Defined in `src/server/services/project-worker.ts`, re-exported from `src/server/auth/utils.ts`:

```ts
{
  id: string
  projectId: string
  userId: string | null
  type: string // 'user' | 'bot'
  name: string
  role: string // 'admin' | 'member'
  createdAt: Date
}
```

### Drizzle relations

`projectWorkers` ↔ `projectWorkerApiTokens` relations are defined in their respective schema files to support `db.query` with `with` joins.

### Unchanged

- `getAuthUser()` — session-only, unchanged.
- `requireAuthOrRedirect()` — only used in server components (pages), not API routes.
- `requireAdminOrNotFound()` — admin pages are session-only.
- Services layer — receives `projectWorker.id` from callers, unaffected.

## UI: Workers Mode & Token Management

### Workers mode

Add "Workers" as a new mode in the app mode selector (alongside existing modes like Issues, etc.). Routes:

- `/app/projects/[projectId]/workers` — list all workers in the project (both user and bot)
- `/app/projects/[projectId]/workers/[workerId]` — worker detail page

### Worker detail page (`/workers/[workerId]`)

- Shows worker info (name, type, role, created date)
- **API Tokens section**: create, list, and revoke tokens for this worker
  - Create token → show once in a copy-able dialog
  - List tokens (name, tokenHint, lastUsedAt, createdAt)
  - Revoke (delete) token

### Workers list page (`/workers`)

- Lists all project workers with name, type, role
- Click through to worker detail page

## Tasks

- [x] Create `project_worker_api_tokens` schema in `src/server/db/schema/`
- [x] Update auth to resolve project worker API tokens
- [x] Create `project-worker-api-token` service (create, list, revoke)
- [ ] Add Workers mode to app mode selector
- [ ] Build workers list page
- [ ] Build worker detail page with token management
- [ ] Migration (user runs `db:generate` + `db:migrate`)
