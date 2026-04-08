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

## Tasks

### Task 1: Refactor `getCliContext()` to throw instead of `process.exit()`

- [x] `packages/naholo-cli/src/context.ts` -- change `getCliContext()` to throw descriptive errors instead of calling `process.exit()` (e.g., `"Not logged in. Run 'naholo login'"`, `"No project config found. Run 'naholo init'"`). This makes it usable by both CLI commands and the MCP server.
- [x] `packages/naholo-cli/src/errors.ts` -- created `CliError` class (for intended errors, message-only output) and `withErrorHandling()` wrapper (catches `CliError` → prints message + exit 1, re-throws unexpected errors with stack). All command `.action()` callbacks wrapped with `withErrorHandling()`. Intended `console.error` + `process.exit` patterns replaced with `throw new CliError()`.

### Task 2: Add `naholo mcp` subcommand entry point

- [ ] `packages/naholo-cli/package.json` -- add dependencies: `@modelcontextprotocol/sdk` (^1.12.1), `zod` (^4.3.6)
- [ ] `packages/naholo-cli/src/commands/mcp.ts` -- create new command file:
  - Export `mcpCommand` as a `Command` with name `'mcp'` and description `'Start MCP server (stdio transport)'`
  - On action: call `startMcpServer()` (defined in Task 3)
- [ ] `packages/naholo-cli/src/cli.ts` -- import and `program.addCommand(mcpCommand)`

### Task 3: Move MCP server logic into CLI

- [ ] `packages/naholo-cli/src/mcp/server.ts` -- create file with `startMcpServer()` function:
  - Resolve config using `getCliContext()` from `packages/naholo-cli/src/context.ts` (refactored in Task 1)
  - Register all existing tools from current `packages/naholo-mcp/src/index.ts` (10 tools: `get_project`, `list_issues`, `get_issue`, `create_issue`, `close_issue`, `get_tasks`, `create_task`, `update_task`, `get_notes`, `create_log`)
  - Register all existing resources (3 resources: `naholo://project`, `naholo://issues`, `naholo://issues/{issueId}`)
  - Connect via `StdioServerTransport`
  - Tool handlers use `client` and `projectId` from context instead of `getClient()` / `getProjectId()` globals
- [ ] `packages/naholo-cli/src/mcp/tools.ts` -- extract tool registration into a function `registerTools(server: McpServer, client: NaholoClient, projectId: string)` to keep `server.ts` clean. Move all `server.registerTool()` calls here.
- [ ] `packages/naholo-cli/src/mcp/resources.ts` -- extract resource registration into `registerResources(server: McpServer, client: NaholoClient, projectId: string)`. Move all `server.registerResource()` calls here.

### Task 4: Delete naholo-mcp package

- [ ] Delete `packages/naholo-mcp/` directory entirely
- [ ] Remove `naholo-mcp` from root `package.json` workspaces (if listed)
- [ ] Remove any references to `naholo-mcp` in `tsconfig` or other config files

### Task 5: Update .mcp.json for this repo

- [ ] `.mcp.json` (project root) -- create or update with:
  ```json
  {
    "mcpServers": {
      "naholo": {
        "command": "naholo",
        "args": ["mcp"]
      }
    }
  }
  ```
  No env vars needed -- the MCP server resolves credentials from CLI config files.

## Notes

- After migration, `naholo login` + `naholo init` is the only setup needed -- MCP "just works" by reading the same config files
- `getCliContext()` throws instead of calling `process.exit()` so MCP can catch and report errors via protocol instead of killing the process
