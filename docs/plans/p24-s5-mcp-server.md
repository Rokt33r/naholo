# P24-S4: MCP Server

Build an MCP (Model Context Protocol) server so Claude Code can interact with Naholo natively.

## Setup

- Separate package or directory: `packages/naholo-mcp-server/` (or `mcp/`)
- TypeScript, uses `@modelcontextprotocol/sdk`
- Configured with Naholo base URL + API token (from Step 1)

## MCP Tools

Since the token is scoped to a single project, all MCP tools operate within that project implicitly — no project selection needed.

| Tool           | Description                        | Maps to                                           |
| -------------- | ---------------------------------- | ------------------------------------------------- |
| `get_project`  | Get current project details        | `GET /api/projects/:pid`                          |
| `list_issues`  | List issues (open/closed)          | `GET /api/projects/:pid/issues`                   |
| `get_issue`    | Get issue with summary context     | `GET /api/projects/:pid/issues/:iid/summary`      |
| `create_issue` | Create a new issue                 | `POST /api/projects/:pid/issues`                  |
| `close_issue`  | Close an issue                     | `POST /api/projects/:pid/issues/:iid/close`       |
| `get_tasks`    | Get task tree for an issue         | `GET /api/projects/:pid/issues/:iid/tasks/tree`   |
| `create_task`  | Create a new task                  | `POST /api/projects/:pid/issues/:iid/tasks`       |
| `update_task`  | Mark task done/undone, update name | `PATCH /api/projects/:pid/issues/:iid/tasks/:tid` |
| `get_notes`    | Read notes for context             | `GET /api/projects/:pid/issues/:iid/notes`        |
| `create_log`   | Post a log entry                   | `POST /api/projects/:pid/issues/:iid/logs`        |

## MCP Resources (optional, for richer context)

- `naholo://project` — current project details
- `naholo://issues` — issue list for the project
- `naholo://issues/{id}` — full issue context (tasks + notes + recent logs)

## Configuration

User adds to their Claude Code MCP config:

```json
{
  "mcpServers": {
    "naholo": {
      "command": "npx",
      "args": ["naholo-mcp"],
      "env": {
        "NAHOLO_URL": "https://naholo.example.com",
        "NAHOLO_TOKEN": "naholo_..."
      }
    }
  }
}
```

## Tasks

- [ ] Initialize MCP server package with `@modelcontextprotocol/sdk`
- [ ] Implement API client wrapper (handles auth, base URL)
- [ ] Implement all MCP tools listed above
- [ ] Implement MCP resources (optional)
- [ ] Test with Claude Code locally
- [ ] Publish to npm as `naholo-mcp`

## Future Considerations (Out of Scope)

- **Skills/Prompts**: Allow users to define reusable prompt templates in Naholo that the MCP server exposes as MCP prompts. Users could create "weekly report" or "triage issues" skills.
- **System logs**: Auto-generated logs when tasks/notes change (see issues-preps.md).
- **Webhook/real-time**: Push notifications to Claude Code when issues are updated.
