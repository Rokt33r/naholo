---
name: exfil
description: Sync local issue changes back to Naholo — push tasks, notes, post summary log, optionally close.
argument-hint: '[issueNumber] ["extra instructions in quotes"]'
---

# Exfil — Sync Back and Unlock

Sync local changes back to Naholo, post a summary log, and clean up the local working directory.

## Arguments

Optional issue number as first token (e.g., `42`). If provided, use `.naholo/local/issues/42/` directly — if that directory doesn't exist, tell the user there's nothing to exfil for that issue.

Anything after in quotes is extra instructions. Common patterns:

- `"close, nice work"` — close the issue after syncing
- `"don't close, pausing for review"` — sync but leave issue open
- `"close"` — close without extra commentary

If no instructions given, ask the user whether to close.

## What to do

1. **Find locked issue**: If an issue number was provided, use it. Otherwise look for `.naholo/local/issues/*/` directories.
   - If none exist → tell user there's no locked issue to exfil.
   - If multiple exist → ask user which one.
   - Verify `.naholo/local/issues/{issueNumber}/` exists — if not, tell user there's nothing to exfil.

2. **Read local state**:
   - `.naholo/local/issues/{issueNumber}/TASKS.md`
   - All files in `.naholo/local/issues/{issueNumber}/notes/`

3. **Read server state**: Use MCP resource `naholo://issues/{issueNumber}` to get current tasks and notes from the server.

4. **Sync tasks**: Compare local TASKS.md against server tasks:
   - Tasks with `[ref]` that are `[x]` locally but not `done` on server → `update_task` with `done: true`
   - Tasks with `[ref]` whose name changed locally → `update_task` with new `name`
   - Tasks without `[ref]` (new, added during `/spec` or `/ship`) → `create_task`, then update TASKS.md with the new `[ref]` link
   - Preserve hierarchy: new subtasks should use `parentTaskId` from their parent's `[ref]`

5. **Sync notes**: Compare local notes against server notes:
   - For each `notes/*.md` file, match to server note by `name` (filename without `.md` extension)
   - If content changed → `update_note` with new content (need note ID from server state)
   - If new (no server match) → `create_note` with name and content

6. **Post summary log**: Generate a diff summary and post via `create_log` MCP tool. Include:
   - Tasks completed (count and names)
   - Tasks added (count and names)
   - Notes created or updated
   - Brief description of code changes (run `git diff --stat` if available, or summarize from PLAN.md progress)

7. **Ask about closing**: Unless extra instructions already specify:
   - Ask the user: "Close issue #{issueNumber}?"
   - If yes → use `close_issue` MCP tool
   - If no → leave open

8. **Clean up**: Delete the `.naholo/local/issues/{issueNumber}/` directory.

## Rules

- **Do NOT implement any code** — only sync state and clean up.
- **Do NOT modify source files** — exfil is a sync operation only.
- **Be conservative with task matching**: Only match tasks by their `[ref]` task ID. Don't try to fuzzy-match tasks by name.
- **Report conflicts**: If a task was modified on both server and locally (different name AND different done state), report the conflict and ask the user which version to keep.
- **Always post the summary log** before closing or cleaning up — the log is the permanent record of what happened during this lock-in session.
