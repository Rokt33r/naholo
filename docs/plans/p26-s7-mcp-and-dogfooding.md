# P26-S7: Merge MCP into CLI

## Goal

Merge `naholo-mcp` into `naholo-cli` as a `naholo mcp` subcommand so the MCP server reuses CLI's config resolution (profiles, project config, local config) instead of requiring manually-copied env var tokens.

## Prerequisites

- p26-s5 (CLI commands) -- DONE, config structure finalized

## Architecture Decisions

- **Merge MCP into CLI** rather than keeping a separate `naholo-mcp` package. The MCP server becomes `naholo mcp` subcommand that starts the stdio transport. This eliminates the security risk of users copying tokens into `.mcp.json` env vars or local files.
- **Config resolution**: MCP reuses `getCliContext()` from `packages/naholo-cli/src/context.ts` to resolve `baseUrl`, `token`, and `projectId` from the same profile/config files the CLI uses. No env var fallback -- all config comes from files managed by `naholo login` + `naholo init`.
- **MCP SDK stays as CLI dependency** -- `@modelcontextprotocol/sdk` and `zod` move into `naholo-cli`'s `package.json`.
- **Delete `packages/naholo-mcp/`** after migration is complete.
- `.mcp.json` config becomes `{ "mcpServers": { "naholo": { "command": "naholo", "args": ["mcp"] } } }` -- no env vars needed for local dev.

### Resources (read-only context, fetched by URI)

| Resource | URI                               | Description                                              |
| -------- | --------------------------------- | -------------------------------------------------------- |
| project  | `naholo://project`                | Current project details                                  |
| issues   | `naholo://issues`                 | Open issues list                                         |
| issue    | `naholo://issues/{issueId}`       | Full issue context (issue + tasks + notes + recent logs) |
| tasks    | `naholo://issues/{issueId}/tasks` | All tasks for an issue                                   |
| notes    | `naholo://issues/{issueId}/notes` | All notes for an issue                                   |

### Tools (write actions)

| Tool           | Description                      |
| -------------- | -------------------------------- |
| `create_issue` | Create a new issue               |
| `close_issue`  | Close an issue                   |
| `create_task`  | Create a task in an issue        |
| `update_task`  | Update a task (name, note, done) |
| `create_log`   | Create a log entry for an issue  |

## Tasks

### Task 1: Refactor `getCliContext()` to throw instead of `process.exit()`

- [x] `packages/naholo-cli/src/context.ts` -- change `getCliContext()` to throw descriptive errors instead of calling `process.exit()` (e.g., `"Not logged in. Run 'naholo login'"`, `"No project config found. Run 'naholo init'"`). This makes it usable by both CLI commands and the MCP server.
- [x] `packages/naholo-cli/src/errors.ts` -- created `CliError` class (for intended errors, message-only output) and `withErrorHandling()` wrapper (catches `CliError` → prints message + exit 1, re-throws unexpected errors with stack). All command `.action()` callbacks wrapped with `withErrorHandling()`. Intended `console.error` + `process.exit` patterns replaced with `throw new CliError()`.

### Task 2: Add `naholo mcp` subcommand entry point

- [x] `packages/naholo-cli/package.json` -- add dependencies: `@modelcontextprotocol/sdk` (^1.12.1), `zod` (^4.3.6)
- [x] `packages/naholo-cli/src/commands/mcp.ts` -- create new command file:
  - Export `mcpCommand` as a `Command` with name `'mcp'` and description `'Start MCP server (stdio transport)'`
  - On action: call `startMcpServer()` (defined in Task 3)
- [x] `packages/naholo-cli/src/cli.ts` -- import and `program.addCommand(mcpCommand)`

### Task 3: Move MCP server logic into CLI

- [x] `packages/naholo-cli/src/mcp/server.ts` -- create file with `startMcpServer()` function:
  - Resolve config using `getCliContext()` from `packages/naholo-cli/src/context.ts` (refactored in Task 1)
  - Register tools and resources (see lists below)
  - Connect via `StdioServerTransport`
  - Handlers use `client` and `projectId` from context instead of `getClient()` / `getProjectId()` globals
- [x] `packages/naholo-cli/src/mcp/tools.ts` -- extract tool registration into a function `registerTools(server: McpServer, client: NaholoClient, projectId: string)` to keep `server.ts` clean. Move all `server.registerTool()` calls here.
- [x] `packages/naholo-cli/src/mcp/resources.ts` -- extract resource registration into `registerResources(server: McpServer, client: NaholoClient, projectId: string)`. Move all `server.registerResource()` calls here.

### Task 4: Delete naholo-mcp package

- [x] Delete `packages/naholo-mcp/` directory entirely
- [x] Remove `naholo-mcp` from root `package.json` workspaces (if listed) -- not listed explicitly, `packages/*` glob handles it
- [x] Remove any references to `naholo-mcp` in `tsconfig` or other config files -- no references found outside the deleted package

### Task 5: Configure .mcp.json via `naholo init`

- [x] `packages/naholo-cli/src/commands/init.ts` -- at the end of both `handleFirstTimeInit()` and `handleSubsequentInit()`, call a new `writeMcpConfig()` helper
- [x] `packages/naholo-cli/src/mcp-config.ts` -- create helper `writeMcpConfig()`:
  - If `.mcp.json` exists, read and parse it, then add/overwrite `mcpServers.naholo` entry
  - If `.mcp.json` does not exist, create it with the naholo entry
  - Entry value: `{ "command": "naholo", "args": ["mcp"] }`

### Task 6: Update tools and resources to match new split

- [x] `packages/naholo-cli/src/mcp/tools.ts` -- remove `get_project`, `list_issues`, `get_issue`, `get_tasks`, `get_notes` tools. Keep only write actions: `create_issue`, `close_issue`, `create_task`, `update_task`, `create_log`.
- [x] `packages/naholo-cli/src/mcp/resources.ts` -- add two new resource templates:
  - `tasks`: `naholo://issues/{issueId}/tasks` — calls `client.listTasks(projectId, issueId)`, returns JSON
  - `notes`: `naholo://issues/{issueId}/notes` — calls `client.listNotes(projectId, issueId)`, returns JSON

## Notes

- After migration, `naholo login` + `naholo init` is the only setup needed -- MCP "just works" by reading the same config files
- `getCliContext()` throws instead of calling `process.exit()` so MCP can catch and report errors via protocol instead of killing the process
