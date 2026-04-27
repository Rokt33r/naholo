---
name: sitrep
description: Sync local progress to Naholo — push objectives, notes, post summary log. Does not close or clean up.
argument-hint: '[operationNumber]'
model: sonnet
---

# Sitrep — Sync Progress

Sync local changes back to Naholo and post a summary log, without closing the operation or cleaning up the local directory. Use this for mid-session checkpoints.

## Arguments

Optional operation number as first token (e.g., `42`). If omitted, the skill picks the infiled operation via `naholo agent op-list` (or asks if multiple).

## What to do

0. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

0.5. **Load manual**: If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

1. **Find infiled operation**: If an operation number was provided, use it. Otherwise run `naholo agent op-list` to list infiled operations.
   - If none exist → tell user to run `/infil {operationNumber}` first and stop.
   - If multiple exist → show the list and ask user which one to use.

2. **Resolve operation directory**: Run `naholo agent op-path {operationNumber}` to get the absolute operation directory; call this `{operationDir}`. All file paths in this skill compose on top of it. If `{operationDir}` does not exist on disk, tell the user to run `/infil {operationNumber}` first and stop.

3. **Read local state** (for context when generating the summary log):
   - `{operationDir}/OBJECTIVES.md`
   - `{operationDir}/notes/OPERATION.md`

4. **Push via CLI**: Run `naholo agent push {operationNumber}` using the Bash tool. Read the CLI output to know what was synced.

5. **Post summary log**: Generate a diff summary and post via `create_operation_log` MCP tool. Include:
   - Objectives completed (count and names)
   - Objectives added (count and names)
   - Notes created or updated
   - Brief description of code changes (run `git diff --stat` if available, or summarize from SPEC.md/OPERATION.md progress)

6. **Update OPERATION.md Timeline**: Append a single bullet to the `## Timeline` section of `{operationDir}/notes/OPERATION.md`: `- **{date} — sitrep**: Synced {N} objectives, {N} notes. {brief summary}`. Do NOT add any new sections — OPERATION.md retains exactly four sections (Pain, Resolution, Open questions, Timeline).

7. **Print summary**: Output what was synced to chat. Use markdown link syntax with the absolute paths so the user can click to open them (e.g., `[OBJECTIVES.md]({operationDir}/OBJECTIVES.md)`, `[SPEC.md]({operationDir}/notes/SPEC.md)`). When listing notes, use the fixed order: OPERATION → OBJECTIVES → SPEC first, then other notes alphabetically. Print as raw markdown — no surrounding fence.

## Rules

- **Do NOT close the operation** — sitrep is a checkpoint, not a finish line.
- **Do NOT clean up the local directory** — leave `{operationDir}` intact for continued work.
- **Do NOT implement any code** — only sync state.
- **Do NOT modify source files** — sitrep is a sync operation only.
- **Use `naholo agent push` for all syncing** — do not manually call MCP tools for syncing objectives or notes, or manage `.base/` files. The CLI handles all of this.
- **OPERATION.md stays at four sections** — Timeline is the only place sitrep appends.
- **Always post the summary log** — the log is the checkpoint record.
- Print the summary as raw markdown — no surrounding fence.
