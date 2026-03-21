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

Add a hook (e.g. `useCurrentProjectWorker()`) that provides the authenticated user's project worker data for the current project. Components use this to determine ownership — e.g. log alignment compares `log.projectWorkerId === currentWorker.id`. This context should be populated once at the project layout level via an API call or server-rendered prop.

## API Changes

- `POST /api/projects/[projectId]/issues/[issueId]/logs` — no changes to the request body
  - When authenticated via token, the log is attributed to the token's project worker
  - When authenticated via session cookie, attributed to the user's worker as usual

## Tasks

- [ ] Update log list API to include worker info (name, type)
- [ ] Update log list UI to render bot vs user workers differently
