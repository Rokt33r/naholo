---
name: exfil
description: Sync local issue changes back to Naholo — push tasks, notes, post summary log, optionally close.
argument-hint: '[issueNumber] ["extra instructions in quotes"]'
---

# Exfil — Sync Back and Clean Up

Sync local changes back to Naholo, post a summary log, and clean up the local working directory.

## Arguments

Optional issue number as first token (e.g., `42`). If provided, use `.naholo/local/issues/42/` directly — if that directory doesn't exist, tell the user there's nothing to exfil for that issue.

Anything after in quotes is extra instructions. Common patterns:

- `"close, nice work"` — close the issue after syncing
- `"don't close, pausing for review"` — sync but leave issue open
- `"close"` — close without extra commentary

If no instructions given, ask the user whether to close.

## What to do

1. **Find infiled issue**: If an issue number was provided, use it. Otherwise read the MCP resource `naholo://local/issues` to list infiled issues.
   - If none exist → tell user there's no infiled issue to exfil.
   - If multiple exist → show the list and ask user which one.

2. **Read local state**:
   - `.naholo/local/issues/{issueNumber}/TASKS.md`
   - All files in `.naholo/local/issues/{issueNumber}/notes/`

3. **Read server state**: Use MCP resource `naholo://issues/{issueNumber}` to get current tasks and notes from the server.

4. **Sync tasks**: Read the full content of `TASKS.md` and pass it to the `sync_tasks` MCP tool as `tasksMarkdown`. This syncs the entire task tree in one call — the server resolves positions, creates new tasks, updates existing ones, and preserves orphans.
   - After the call, the result contains `created: { id, name }[]` for newly created tasks
   - For each created task, find the matching line in TASKS.md by name and append ` [ref](naholo://tasks/{id})` to it
   - Write the updated TASKS.md back to disk

5. **Sync notes**: Compare local notes against server notes:
   - For each `notes/*.md` file, match to server note by `name` (filename without `.md` extension)
   - If content changed → `update_note` with note name and new content
   - If new (no server match) → `create_note` with name and content

6. **Post summary log**: Generate a diff summary and post via `create_log` MCP tool. Include:
   - Tasks completed (count and names)
   - Tasks added (count and names)
   - Notes created or updated
   - Brief description of code changes (run `git diff --stat` if available, or summarize from SPEC.md/PLAN.md progress)

7. **Ask about closing**: Unless extra instructions already specify:
   - Use the `AskUserQuestion` tool to ask: "Close issue #{issueNumber}?" Do NOT proceed until they respond.
   - If yes → use `close_issue` MCP tool
   - If no → leave open

8. **Print summary**: Output what was synced to chat before cleanup. Use markdown link syntax for file paths so the user can click to open them (e.g., `[TASKS.md](.naholo/local/issues/{N}/TASKS.md)`, `[SPEC.md](.naholo/local/issues/{N}/notes/SPEC.md)`).

9. **Clean up**: Delete the `.naholo/local/issues/{issueNumber}/` directory.

## Rules

- **Do NOT implement any code** — only sync state and clean up.
- **Do NOT modify source files** — exfil is a sync operation only.
- **Use `sync_tasks` for task syncing**: Always use the bulk `sync_tasks` MCP tool instead of individual `create_task` / `update_task` calls.
- **Always post the summary log** before closing or cleaning up — the log is the permanent record of what happened during this infil session.
