# P24-S3: API Completeness

Ensure all operations an AI agent needs are available via REST.

## New Endpoints Needed

| Endpoint                        | Purpose                    |
| ------------------------------- | -------------------------- |
| `GET /api/projects/[projectId]` | Get single project details |

No separate task tree or summary endpoints needed — existing endpoints (`GET /tasks`, `GET /notes`, `GET /logs`) already cover what an AI agent needs. `parentTaskId` in the task response is sufficient for understanding hierarchy.

## Bug Fixes

- `listNotes` in `src/server/services/note.ts` filters by `projectWorkerId` — should list all notes for the issue, not just the current worker's. Same issue as p24-s3 fixed for other services.

## API Response Improvements

- All list endpoints should support basic pagination (`?limit=&offset=`)

## Tasks

- [x] Fix `listNotes` to query by `issueId` only (remove `projectWorkerId` filter)
- [x] Add `GET /api/projects/[projectId]` endpoint
- [x] Verify all endpoints work with token auth
