---
name: sitrep
description: Sync local progress to Naholo — push objectives, notes, post summary log. Does not close or clean up.
argument-hint: '{operationNumber}'
model: sonnet
---

# Sitrep — Sync Progress

Sync local changes back to Naholo and post a summary log, without closing the operation or cleaning up the local directory. Use this for mid-session checkpoints.

## Terminology

| Entity    | Acronym | Familiar Term  | Familiar Context                  |
| --------- | ------- | -------------- | --------------------------------- |
| Operation | OP      | issue          | GitHub Issues                     |
| Objective | OBJ     | task           | tasks within an issue             |
| Operator  | OPR     | project member | GitHub / general PM               |
| Campaign  | —       | milestone/epic | GitHub Milestones / PM tool epics |

Users may refer to entities by any column — entity name, acronym, or familiar term. For example, "task 1.1" means objective 1.1; "issue #42" means operation #42. Resolve all aliases.

## Arguments

The argument is the operation number (e.g., `42`). Required. Find local dir at `.naholo/local/operations/{operationNumber}/`. If that directory doesn't exist, tell the user to run `/infil {operationNumber}` first and stop.

## What to do

0. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

1. **Read local state** (for context when generating the summary log):
   - `.naholo/local/operations/{operationNumber}/OBJECTIVES.md`
   - `.naholo/local/operations/{operationNumber}/notes/OPERATION.md`

2. **Push via CLI**: Run `naholo push {operationNumber}` using the Bash tool. This command:
   - Reads local `OBJECTIVES.md` and syncs the objective tree to the server
   - Patches `[ref]` links for newly created objectives back into `OBJECTIVES.md`
   - Reads all `notes/*.md` files and syncs to the server (creates new, updates changed)
   - Updates `.base/` with the current local state as the new baseline
   - Outputs a human-readable report to stdout with sync results

   Read the CLI output to understand what was synced (objectives created, notes updated/created).

3. **Post summary log**: Generate a diff summary and post via `create_operation_log` MCP tool. Include:
   - Objectives completed (count and names)
   - Objectives added (count and names)
   - Notes created or updated
   - Brief description of code changes (run `git diff --stat` if available, or summarize from SPEC.md/OPERATION.md progress)

4. **Update OPERATION.md Timeline**: Append a timeline entry to `## Timeline` in `notes/OPERATION.md`: `- **{date} — sitrep**: Synced {N} objectives, {N} notes. {brief summary}`.

5. **Print summary**: Output what was synced to chat. Use markdown link syntax for file paths so the user can click to open them (e.g., `[OBJECTIVES.md](.naholo/local/operations/{N}/OBJECTIVES.md)`, `[SPEC.md](.naholo/local/operations/{N}/notes/SPEC.md)`).

## Rules

- **Do NOT close the operation** — sitrep is a checkpoint, not a finish line.
- **Do NOT clean up the local directory** — leave `.naholo/local/operations/{operationNumber}/` intact for continued work.
- **Do NOT implement any code** — only sync state.
- **Do NOT modify source files** — sitrep is a sync operation only.
- **Use `naholo push` for all syncing** — do not manually call MCP tools for syncing objectives or notes, or manage `.base/` files. The CLI handles all of this.
- **Always post the summary log** — the log is the checkpoint record.
