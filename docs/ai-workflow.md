# Naholo — AI-Assisted Development Workflow

Naholo connects idea capture (in the web app) to plan execution (in local repos with AI agents). This document describes the intended workflow for using Naholo as a development harness.

## Workflow Phases

### Phase 1: Capture Ideas

User creates an issue in Naholo and collects context:

- **Logs**: Quick thoughts, requirements, questions — dropped as messenger-style messages. Low friction, append-only.
- **Notes**: Structured reference material — specs, API designs, research. Tabbed markdown documents with autosave.

This is the brainstorming/collection phase. The issue accumulates everything needed to start work.

### Phase 2: Plan

User picks an issue to work on. An AI agent reads the issue context and produces an actionable plan:

1. Agent reads the issue via MCP resource (`naholo://issues/{issueNumber}`) — gets tasks, logs, and notes in one call
2. Agent processes the collected information into a structured plan
3. Plan is written as markdown file(s) in the local repo (e.g., `docs/plans/pN-feature.md`)
4. Plan contains numbered tasks with subtasks, exact file paths, and implementation details
5. Tasks from the plan can be synced to the issue in Naholo via MCP (`create_task`)

### Phase 3: Execute

AI and human collaborate on the plan:

- Agent implements tasks from the plan document, checking them off (`- [x]`) as completed
- Specs may change mid-execution — the plan doc is updated accordingly
- Progress is tracked locally (in the markdown checkboxes) and remotely (via MCP tools):
  - `update_task` — mark tasks done, update names/notes
  - `create_log` — post progress updates visible to everyone

### Phase 4: Wrap Up

When work on the issue is completed, paused, or aborted:

1. **Summarize**: Agent posts a summary log entry describing what was done
2. **Preserve plans**: Local markdown plan files are registered as issue notes (so the work is preserved in Naholo even if the repo moves on)
3. **Sync tasks**: Task completion state is synced to the issue's tasks in Naholo
4. **Close**: If the issue is completed, close it (optionally with a final log message)

## Key Integration Points

| Tool                               | Role in workflow                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| MCP Resource `naholo://issues/{n}` | Agent reads issue context (tasks, logs, notes) to understand what to work on   |
| MCP Resource `naholo://issues`     | Agent lists open issues to pick from                                           |
| MCP Tool `create_task`             | Agent creates tasks in Naholo from the plan                                    |
| MCP Tool `update_task`             | Agent marks tasks done, updates progress                                       |
| MCP Tool `create_log`              | Agent posts progress updates and summaries                                     |
| MCP Tool `close_issue`             | Agent closes a completed issue                                                 |
| CLI `naholo skills install`        | Installs shared skills/instructions for consistent agent behavior across repos |
| Skills (web UI)                    | Team-shared Claude Code instructions managed centrally                         |

## Current State

This workflow is the vision. Current automation status:

| Step                                               | Status                                                    |
| -------------------------------------------------- | --------------------------------------------------------- |
| Reading issue context via MCP                      | Working                                                   |
| Creating tasks/logs via MCP                        | Working                                                   |
| Closing issues via MCP                             | Working                                                   |
| Plan file creation (local markdown)                | Working (via skills like `/elaborate-plan`, `/ship-plan`) |
| Plan-to-note sync (uploading plans as issue notes) | Manual                                                    |
| Task sync on wrap-up (bulk progress update)        | Manual                                                    |
| Auto-summarize on wrap-up                          | Manual                                                    |

The gap between "working" and "manual" steps represents future automation opportunities.
