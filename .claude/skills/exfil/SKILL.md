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

5. **Sync notes**: Compare local notes against server notes:
   - For each `notes/*.md` file, match to server note by `name` (filename without `.md` extension)
   - If content changed → `update_note` with note name and new content
   - If new (no server match) → `create_note` with name and content

6. **Post summary log**: Generate a diff summary and post via `create_operation_log` MCP tool. Include:
   - Objectives completed (count and names)
   - Objectives added (count and names)
   - Notes created or updated
   - Brief description of code changes (run `git diff --stat` if available, or summarize from SPEC.md/OPERATION.md progress)

7. **Update OPERATION.md Timeline**: Append a timeline entry to `## Timeline` in `notes/OPERATION.md`: `- **{date} — exfil**: Final sync. {objectives done}/{total objectives}. {close status}`.

8. **Close or ask about closing**:
   - If extra instructions already specify → follow them.
   - If all objectives in OBJECTIVES.md are done → close automatically via `close_operation` MCP tool (no need to ask).
   - Otherwise → use `AskUserQuestion` to ask: "Close operation #{operationNumber}?" Do NOT proceed until they respond.
     - If yes → use `close_operation` MCP tool
     - If no → leave open

9. **Print summary**: Output what was synced to chat before cleanup. Use markdown link syntax for file paths so the user can click to open them (e.g., `[OBJECTIVES.md](.naholo/local/operations/{N}/OBJECTIVES.md)`, `[SPEC.md](.naholo/local/operations/{N}/notes/SPEC.md)`).

10. **Clean up**: Delete the `.naholo/local/operations/{operationNumber}/` directory.

## Rules

- **Do NOT implement any code** — only sync state and clean up.
- **Do NOT modify source files** — exfil is a sync operation only.
- **Use `sync_objectives` for objective syncing**: Always use the bulk `sync_objectives` MCP tool instead of individual `create_objective` / `update_objective` calls.
- **Always post the summary log** before closing or cleaning up — the log is the permanent record of what happened during this infil session.
