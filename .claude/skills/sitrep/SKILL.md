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

3. **Sync tasks**: Compare local TASKS.md against server tasks:
   - Tasks with `[ref]` that are `[x]` locally but not `done` on server → `update_task` with `done: true`
   - Tasks with `[ref]` whose name changed locally → `update_task` with new `name`
   - Tasks without `[ref]` (new, added during `/spec` or `/ship`) → `create_task`, then update TASKS.md with the new `[ref]` link
   - Preserve hierarchy: new subtasks should use `parentTaskId` from their parent's `[ref]`

4. **Sync notes**: Compare local notes against server notes:
   - For each `notes/*.md` file, match to server note by `name` (filename without `.md` extension)
   - If content changed → `update_note` with new content (need note ID from server state)
   - If new (no server match) → `create_note` with name and content

5. **Post summary log**: Generate a diff summary and post via `create_log` MCP tool. Include:
   - Tasks completed (count and names)
   - Tasks added (count and names)
   - Notes created or updated
   - Brief description of code changes (run `git diff --stat` if available, or summarize from PLAN.md progress)

6. **Update `.base/`**: After syncing, overwrite `.base/TASKS.md` and `.base/notes/*.md` with the current server state — this resets the baseline so the next `/infil` re-run diffs correctly.

7. **Print summary**: Output what was synced to chat.

## Rules

- **Do NOT close the issue** — sitrep is a checkpoint, not a finish line.
- **Do NOT clean up the local directory** — leave `.naholo/local/issues/{issueNumber}/` intact for continued work.
- **Do NOT implement any code** — only sync state.
- **Do NOT modify source files** — sitrep is a sync operation only.
- **Be conservative with task matching**: Only match tasks by their `[ref]` task ID. Don't try to fuzzy-match tasks by name.
- **Report conflicts**: If a task was modified on both server and locally (different name AND different done state), report the conflict and ask the user which version to keep.
- **Always post the summary log** — the log is the checkpoint record.
