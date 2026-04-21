# Naholo — CLI and MCP Reference

## Setup

### 1. Login

```bash
naholo login
```

Opens a browser for device-flow authentication. You'll see a word pair on the CLI — confirm it matches in the browser. On success, a user API token is saved to `~/.naholo/profiles/{name}.yml`.

### 2. Initialize a project

```bash
naholo init
```

Interactively selects a project and operator, then writes:

- `.naholo/config.yml` — project ID, slug, and default operator ID (committed to git)
- `.mcp.json` — MCP server config for Claude Code

After init, the MCP server is automatically available to Claude Code.

## CLI Commands

| Command                                                  | Description                                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `naholo login`                                           | Authenticate via browser (device flow)                                                |
| `naholo logout`                                          | Remove active profile                                                                 |
| `naholo init`                                            | Initialize project in current directory                                               |
| `naholo status`                                          | Show current project and operator                                                     |
| `naholo whoami`                                          | Show logged-in user info                                                              |
| `naholo mcp`                                             | Start MCP server (stdio transport)                                                    |
| `naholo skills install`                                  | Interactively pick a skill loadout, install as `.claude/skills/{name}/SKILL.md` files |
| `naholo skills upsert <loadoutSlug> <name> <file>`       | Upload a local file as a skill (create or update)                                     |
| `naholo skills loadouts create --name <n> --slug <s>`    | Create a new skill loadout                                                            |
| `naholo skills loadouts update <slug> [--name] [--slug]` | Update a skill loadout                                                                |
| `naholo skills loadouts delete <slug>`                   | Delete a skill loadout (prompts for confirmation)                                     |

## Config Files

### User-level (in home directory)

| File                            | Contents                                          |
| ------------------------------- | ------------------------------------------------- |
| `~/.naholo/config.yml`          | `defaultProfile` — name of the active profile     |
| `~/.naholo/profiles/{name}.yml` | `baseUrl` (server URL) + `token` (user API token) |

### Project-level (in repo root)

| File                 | Git       | Contents                                                                                      |
| -------------------- | --------- | --------------------------------------------------------------------------------------------- |
| `.naholo/config.yml` | Committed | `projectId`, `projectSlug`, `projectOperatorId`                                               |
| `.naholo/.gitignore` | Committed | Ignores `local/`                                                                              |
| `.mcp.json`          | Ignored   | MCP server config: `{ "mcpServers": { "naholo": { "command": "naholo", "args": ["mcp"] } } }` |

## MCP Tools

Write actions available to the agent:

| Tool                   | Input                                                                                                     | Description                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `create_operation`     | `{ title: string }`                                                                                       | Create a new operation in the current project |
| `close_operation`      | `{ operationNumber: number }`                                                                             | Close an operation                            |
| `create_objective`     | `{ operationNumber: number, name: string, note?: string, parentObjectiveId?: string, position?: number }` | Create an objective in an operation           |
| `update_objective`     | `{ operationNumber: number, objectiveId: string, name?: string, note?: string, done?: boolean }`          | Update an objective (any combination)         |
| `create_note`          | `{ operationNumber: number, name: string, content: string }`                                              | Create a note on an operation                 |
| `update_note`          | `{ operationNumber: number, noteName: string, name?: string, content?: string }`                          | Update a note on an operation                 |
| `create_operation_log` | `{ operationNumber: number, content: string }`                                                            | Create a log entry (markdown)                 |
| `sync_objectives`      | `{ operationNumber: number, objectivesMarkdown: string }`                                                 | Sync full objective tree from OBJECTIVES.md   |

## MCP Resources

Read-only context available to the agent:

| URI                                                | Description                                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `naholo://project`                                 | Current project details (JSON)                                                         |
| `naholo://operations`                              | All open operations (JSON array)                                                       |
| `naholo://operations/{operationNumber}`            | Full operation context: metadata + objectives + notes + logs (all fetched in parallel) |
| `naholo://operations/{operationNumber}/objectives` | All objectives for an operation (markdown)                                             |
| `naholo://operations/{operationNumber}/notes`      | All notes for an operation (JSON)                                                      |
| `naholo://local/operations`                        | List of locally infiled operations                                                     |
| `naholo://soul`                                    | Personality / soul text for the current bot operator (markdown)                        |

### Reading a resource in Claude Code

MCP resources are available as context when the MCP server is running. The agent can read them to understand what operations exist, what objectives need to be done, and what context has been captured.

The `naholo://operations/{operationNumber}` resource is the most useful — it returns everything about an operation in one call: the operation itself, all objectives (with hierarchy), all notes (with content), and all logs (with authors).
