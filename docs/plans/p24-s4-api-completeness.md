# P24-S3: API Completeness

Ensure all operations an AI agent needs are available via REST.

## Already Exists (no work needed)

- Issues: list, get, create, update title, close, delete
- Tasks: list, create, update (name, note, done), delete, move
- Notes: list, create, update, delete
- Logs: list, create, update, delete

## New Endpoints Needed

| Endpoint                                                    | Purpose                                                                          |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `GET /api/projects/[projectId]`                             | Get single project details                                                       |
| `GET /api/projects/[projectId]/issues/[issueId]/tasks/tree` | Get full task tree (flat list with depth) for context                            |
| `GET /api/projects/[projectId]/issues/[issueId]/summary`    | Get issue with task stats, recent logs, note titles — single call for AI context |

## API Response Improvements

- All list endpoints should support basic pagination (`?limit=&offset=`)
- Task list should include `depth` and `parentTaskId` in response for tree reconstruction
- Add `?include=tasks,notes,logs` query param on issue GET for bundled responses

## Tasks

- [ ] Add `GET /api/projects/[projectId]` endpoint
- [ ] Add task tree endpoint
- [ ] Add issue summary endpoint
- [ ] Add pagination support to list endpoints
- [ ] Verify all endpoints work with token auth
