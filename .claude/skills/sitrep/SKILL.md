---
name: sitrep
description: Sync local progress to Naholo — push tasks, notes, post summary log. Does not close or clean up.
argument-hint: '{issueNumber}'
---

# Sitrep — Sync Progress

Sync local changes back to Naholo and post a summary log, without closing the issue or cleaning up the local directory. Use this for mid-session checkpoints.

## Arguments

The argument is the issue number (e.g., `42`). Required. Find local dir at `.naholo/local/issues/{issueNumber}/`. If that directory doesn't exist, tell the user to run `/infil {issueNumber}` first and stop.

## What to do

1. **Read local state**:
   - `.naholo/local/issues/{issueNumber}/TASKS.md`
   - All files in `.naholo/local/issues/{issueNumber}/notes/`

2. **Read server state**: Use MCP resource `naholo://issues/{issueNumber}` to get current tasks and notes from the server.

3. **Sync tasks**: Read the full content of `TASKS.md` and pass it to the `sync_tasks` MCP tool as `tasksMarkdown`. This syncs the entire task tree in one call — the server resolves positions, creates new tasks, updates existing ones, and preserves orphans.
   - After the call, the result contains `created: { id, name }[]` for newly created tasks
   - For each created task, find the matching line in TASKS.md by name and append ` [ref](naholo://tasks/{id})` to it
   - Write the updated TASKS.md back to disk

4. **Sync notes**: Compare local notes against server notes:
   - For each `notes/*.md` file, match to server note by `name` (filename without `.md` extension)
   - If content changed → `update_note` with note name and new content
   - If new (no server match) → `create_note` with name and content

5. **Post summary log**: Generate a diff summary and post via `create_log` MCP tool. Include:
   - Tasks completed (count and names)
   - Tasks added (count and names)
   - Notes created or updated
   - Brief description of code changes (run `git diff --stat` if available, or summarize from SPEC.md/PLAN.md progress)

6. **Update `.base/`**: After syncing, overwrite `.base/TASKS.md` and `.base/notes/*.md` with the current server state — this resets the baseline so the next `/infil` re-run diffs correctly.

7. **Print summary**: Output what was synced to chat. Use markdown link syntax for file paths so the user can click to open them (e.g., `[TASKS.md](.naholo/local/issues/{N}/TASKS.md)`, `[SPEC.md](.naholo/local/issues/{N}/notes/SPEC.md)`).

## Rules

- **Do NOT close the issue** — sitrep is a checkpoint, not a finish line.
- **Do NOT clean up the local directory** — leave `.naholo/local/issues/{issueNumber}/` intact for continued work.
- **Do NOT implement any code** — only sync state.
- **Do NOT modify source files** — sitrep is a sync operation only.
- **Use `sync_tasks` for task syncing**: Always use the bulk `sync_tasks` MCP tool instead of individual `create_task` / `update_task` calls.
- **Always post the summary log** — the log is the checkpoint record.
