---
name: sitrep
description: Sync local progress to Naholo — push objectives, notes, post summary log. Does not close or clean up.
argument-hint: '{operationNumber}'
model: sonnet
---

# Sitrep — Sync Progress

Sync local changes back to Naholo and post a summary log, without closing the operation or cleaning up the local directory. Use this for mid-session checkpoints.

## Arguments

The argument is the operation number (e.g., `42`). Required. Find local dir at `.naholo/local/operations/{operationNumber}/`. If that directory doesn't exist, tell the user to run `/infil {operationNumber}` first and stop.

## What to do

0. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

0.5. **Load manual**: If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

1. **Read local state** (for context when generating the summary log):
   - `.naholo/local/operations/{operationNumber}/OBJECTIVES.md`
   - `.naholo/local/operations/{operationNumber}/notes/OPERATION.md`

2. **Push via CLI**: Run `naholo agent push {operationNumber}` using the Bash tool. Read the CLI output to know what was synced.

3. **Post summary log**: Generate a diff summary and post via `create_operation_log` MCP tool. Include:
   - Objectives completed (count and names)
   - Objectives added (count and names)
   - Notes created or updated
   - Brief description of code changes (run `git diff --stat` if available, or summarize from SPEC.md/OPERATION.md progress)

4. **Update OPERATION.md Timeline**: Append a single bullet to the `## Timeline` section of `notes/OPERATION.md`: `- **{date} — sitrep**: Synced {N} objectives, {N} notes. {brief summary}`. Do NOT add any new sections — OPERATION.md retains exactly four sections (Pain, Resolution, Open questions, Timeline).

5. **Print summary**: Output what was synced to chat. Use markdown link syntax for file paths so the user can click to open them (e.g., `[OBJECTIVES.md](.naholo/local/operations/{N}/OBJECTIVES.md)`, `[SPEC.md](.naholo/local/operations/{N}/notes/SPEC.md)`). When listing notes, use the fixed order: OPERATION → OBJECTIVES → SPEC first, then other notes alphabetically. Print as raw markdown — no surrounding fence.

## Rules

- **Do NOT close the operation** — sitrep is a checkpoint, not a finish line.
- **Do NOT clean up the local directory** — leave `.naholo/local/operations/{operationNumber}/` intact for continued work.
- **Do NOT implement any code** — only sync state.
- **Do NOT modify source files** — sitrep is a sync operation only.
- **Use `naholo agent push` for all syncing** — do not manually call MCP tools for syncing objectives or notes, or manage `.base/` files. The CLI handles all of this.
- **OPERATION.md stays at four sections** — Timeline is the only place sitrep appends.
- **Always post the summary log** — the log is the checkpoint record.
- Print the summary as raw markdown — no surrounding fence.
