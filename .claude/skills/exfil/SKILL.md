---
name: exfil
description: Sync local operation changes back to Naholo — push objectives, notes, post summary log, optionally close.
argument-hint: '[operationNumber] ["extra instructions in quotes"]'
model: sonnet
---

# Exfil — Sync Back and Clean Up

Sync local changes back to Naholo, post a summary log, and clean up the local working directory.

## Terminology

| Entity    | Acronym | Familiar Term  | Familiar Context                  |
| --------- | ------- | -------------- | --------------------------------- |
| Operation | OP      | issue          | GitHub Issues                     |
| Objective | OBJ     | task           | tasks within an issue             |
| Operator  | OPR     | project member | GitHub / general PM               |
| Campaign  | —       | milestone/epic | GitHub Milestones / PM tool epics |

Users may refer to entities by any column — entity name, acronym, or familiar term. For example, "task 1.1" means objective 1.1; "issue #42" means operation #42. Resolve all aliases.

## Arguments

Optional operation number as first token (e.g., `42`). If provided, use `.naholo/local/operations/42/` directly — if that directory doesn't exist, tell the user there's nothing to exfil for that operation.

Anything after in quotes is extra instructions. Common patterns:

- `"close, nice work"` — close the operation after syncing
- `"don't close, pausing for review"` — sync but leave operation open

If no instructions given, ask the user whether to close.

## What to do

0. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

1. **Find infiled operation**: If an operation number was provided, use it. Otherwise read the MCP resource `naholo://local/operations` to list infiled operations.
   - If none exist → tell user there's no infiled operation to exfil.
   - If multiple exist → show the list and ask user which one.

2. **Read local state**:
   - `.naholo/local/operations/{operationNumber}/OBJECTIVES.md`
   - All files in `.naholo/local/operations/{operationNumber}/notes/`

3. **Read server state**: Use MCP resource `naholo://operations/{operationNumber}` to get current objectives and notes from the server.

4. **Sync objectives**: Read the full content of `OBJECTIVES.md` and pass it to the `sync_objectives` MCP tool as `objectivesMarkdown`. This syncs the entire objective tree in one call — the server resolves positions, creates new objectives, updates existing ones, and preserves orphans.
   - After the call, the result contains `created: { id, name }[]` for newly created objectives
   - For each created objective, find the matching line in OBJECTIVES.md by name and append ` [ref](naholo://objectives/{id})` to it
   - Write the updated OBJECTIVES.md back to disk
   - **If `sync_objectives` fails → STOP. Do NOT proceed to step 5.** Report the error and preserve local data (see step 8 failure path).

5. **Sync notes**: Compare local notes against server notes:
   - For each `notes/*.md` file, match to server note by `name` (filename without `.md` extension)
   - If content changed → `update_note` with note name and new content
   - If new (no server match) → `create_note` with name and content
   - **If any `update_note` or `create_note` call fails → STOP. Do NOT proceed to step 6.** Report the error and preserve local data (see step 8 failure path).

6. **Post summary log**: Generate a diff summary and post via `create_operation_log` MCP tool. Include:
   - Objectives completed (count and names)
   - Objectives added (count and names)
   - Notes created or updated
   - Brief description of code changes (summarize from SPEC.md/OPERATION.md progress)
   - **If `create_operation_log` fails → STOP. Do NOT proceed to step 7.** Report the error and preserve local data (see step 8 failure path).

7. **Close or ask about closing**:
   - If extra instructions already specify → follow them.
   - If all objectives in OBJECTIVES.md are done → close automatically via `close_operation` MCP tool (no need to ask).
   - Otherwise → use `AskUserQuestion` to ask: "Close operation #{operationNumber}?" Do NOT proceed until they respond.
     - If yes → use `close_operation` MCP tool
     - If no → leave open

8. **Clean up or abort**:
   - **If all sync steps (4-6) completed successfully**: Delete the `.naholo/local/operations/{operationNumber}/` directory.
   - **If any sync step failed**: Do NOT delete. Instead:
     - Print which step failed and what the error was
     - Confirm that local data at `.naholo/local/operations/{operationNumber}/` is preserved
     - Suggest the user retry with `/exfil`

## Rules

- **Do NOT implement any code** — only sync state and clean up.
- **Do NOT modify source files** — exfil is a sync operation only.
- **Use `sync_objectives` for objective syncing**: Always use the bulk `sync_objectives` MCP tool instead of individual `create_objective` / `update_objective` calls.
- **Always post the summary log** before closing or cleaning up — the log is the permanent record of what happened during this infil session.
