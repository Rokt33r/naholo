# P24-S2: Bot Worker Logs

Logs created by bot workers display differently in the UI.

Prerequisite: P23 (Project Workers) — bots are project workers with `type: 'bot'`.

## How It Works

- API consumer authenticates with a project worker token — the token already identifies the worker
- The log is attributed to the authenticated worker (no separate `asWorkerId` needed)
- No schema change to `logs` — `projectWorkerId` (from P23) already tracks authorship

## UI Changes

- Logs from the current user's worker render right-aligned (like sent messages)
- All other logs (other users, bots) render left-aligned (like received messages)
- Left-aligned logs show the worker's name as a label
- Bot logs are read-only in the UI

### Current worker context

`GET /api/projects` already returns the user's project list. Extend it to include the user's `projectWorkerOfCurrentUser` for each project. The project layout (`src/app/app/projects/[projectId]/layout.tsx`) extracts the current project's worker from this data and sets it in `ProjectContext`. Components use `projectContext.currentWorker.id` to determine ownership — e.g. log alignment compares `log.projectWorkerId === currentWorker.id`.

No separate `/workers/me` endpoint needed.

#### `GET /api/projects` response shape

The `projectWorkerOfCurrentUser` field is opt-in via the `with` search param:

- `GET /api/projects` — returns projects without worker info (unchanged)
- `GET /api/projects?with=projectWorkerOfCurrentUser` — includes the user's worker for each project

```ts
// Default (no ?with param)
type Project = {
  id: string
  name: string
  description: string | null
  createdAt: Date
}

// With ?with=projectWorkerOfCurrentUser
type ProjectWithWorker = Project & {
  projectWorkerOfCurrentUser: {
    id: string
    type: string // 'user' | 'bot'
    name: string
    role: string // 'admin' | 'member'
  }
}
```

When `?with=projectWorkerOfCurrentUser` is provided, the service joins `project_workers` where `userId` matches the authenticated user and `projectId` matches the project. Each project the user belongs to will have exactly one matching worker row.

## API Changes

- `GET /api/projects?with=projectWorkerOfCurrentUser` — each project includes a `projectWorkerOfCurrentUser` field with the current user's worker for that project
- `GET /api/projects/[projectId]/issues/[issueId]/logs` — returns all logs for the issue (not scoped to the current worker), each log includes nested `projectWorker: { id, name, type } | null`
- `POST /api/projects/[projectId]/issues/[issueId]/logs` — no changes to the request body
  - When authenticated via token, the log is attributed to the token's project worker
  - When authenticated via session cookie, attributed to the user's worker as usual

## Tasks

- [x] Extend `listProjects` service and `GET /api/projects` to include the user's project worker per project
- [x] Add `currentWorker` to `ProjectContext` (set in project layout)
- [x] Update log list service to return all logs for an issue with worker info (name, type)
- [x] Update log list API to not scope by worker
- [x] Update log hooks and types to include worker fields
- [x] Update log list UI to render bot vs user workers differently (alignment, labels, read-only)
- [x] Fix IDOR: validate issue belongs to project in `listLogs`
