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

Interactively selects a project and worker, then writes:

- `.naholo/config.yml` — project ID and default worker ID (committed to git)
- `.naholo/local/local-config.yml` — project worker ID for this machine (git-ignored)
- `.mcp.json` — MCP server config for Claude Code

After init, the MCP server is automatically available to Claude Code.

## CLI Commands

| Command                                              | Description                                                                       |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| `naholo login`                                       | Authenticate via browser (device flow)                                            |
| `naholo logout`                                      | Remove active profile                                                             |
| `naholo init`                                        | Initialize project in current directory                                           |
| `naholo status`                                      | Show current project and worker                                                   |
| `naholo whoami`                                      | Show logged-in user info                                                          |
| `naholo mcp`                                         | Start MCP server (stdio transport)                                                |
| `naholo skills install`                              | Interactively pick a skill set, install as `.claude/skills/{name}/SKILL.md` files |
| `naholo skills upsert <setSlug> <name> <file>`       | Upload a local file as a skill (create or update)                                 |
| `naholo skills sets create --name <n> --slug <s>`    | Create a new skill set                                                            |
| `naholo skills sets update <slug> [--name] [--slug]` | Update a skill set                                                                |
| `naholo skills sets delete <slug>`                   | Delete a skill set (prompts for confirmation)                                     |

## Config Files

### User-level (in home directory)

| File                            | Contents                                          |
| ------------------------------- | ------------------------------------------------- |
| `~/.naholo/config.yml`          | `defaultProfile` — name of the active profile     |
| `~/.naholo/profiles/{name}.yml` | `baseUrl` (server URL) + `token` (user API token) |

### Project-level (in repo root)

| File                             | Git       | Contents                                                                                      |
| -------------------------------- | --------- | --------------------------------------------------------------------------------------------- |
| `.naholo/config.yml`             | Committed | `projectId`, `defaultWorkerId`                                                                |
| `.naholo/local/local-config.yml` | Ignored   | `projectWorkerId` for this machine                                                            |
| `.naholo/.gitignore`             | Committed | Ignores `local/`                                                                              |
| `.mcp.json`                      | Ignored   | MCP server config: `{ "mcpServers": { "naholo": { "command": "naholo", "args": ["mcp"] } } }` |

## MCP Tools

Write actions available to the agent:

| Tool           | Input                                                                                            | Description                               |
| -------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `create_issue` | `{ title: string }`                                                                              | Create a new issue in the current project |
| `close_issue`  | `{ issueNumber: number }`                                                                        | Close an issue                            |
| `create_task`  | `{ issueNumber: number, name: string, note?: string, parentTaskId?: string, position?: number }` | Create a task in an issue                 |
| `update_task`  | `{ issueNumber: number, taskId: string, name?: string, note?: string, done?: boolean }`          | Update a task (any combination of fields) |
| `create_log`   | `{ issueNumber: number, content: string }`                                                       | Create a log entry (markdown)             |

## MCP Resources

Read-only context available to the agent:

| URI                                   | Description                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `naholo://project`                    | Current project details (JSON)                                                      |
| `naholo://issues`                     | All open issues (JSON array)                                                        |
| `naholo://issues/{issueNumber}`       | Full issue context: issue metadata + tasks + notes + logs (all fetched in parallel) |
| `naholo://issues/{issueNumber}/tasks` | All tasks for an issue                                                              |
| `naholo://issues/{issueNumber}/notes` | All notes for an issue                                                              |

### Reading a resource in Claude Code

MCP resources are available as context when the MCP server is running. The agent can read them to understand what issues exist, what tasks need to be done, and what context has been captured.

The `naholo://issues/{issueNumber}` resource is the most useful — it returns everything about an issue in one call: the issue itself, all tasks (with hierarchy), all notes (with content), and all logs (with authors).
