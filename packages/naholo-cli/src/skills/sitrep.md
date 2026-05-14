---
name: sitrep
description: Sync local progress to Naholo — push objectives and notes (including TIMELINE.md), post summary log. Does not close.
argument-hint: '["freeform"]'
model: sonnet
---

# Sitrep — Sync Progress

Sync local changes back to Naholo and post a summary log, without closing the operation or cleaning up the local directory. Use this for mid-session checkpoints.

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op`.

Anything in quotes is optional freeform context that informs the summary log (e.g., `"checkpoint before refactor"` or `"resuming tomorrow"`). Most invocations have no args.

## What to do

1. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

2. **Load manual**: If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

3. **Find infiled operation**: Run `naholo agent op`. If it errors with "No infiled operation", tell the user to run `/infil {operationNumber}` first and stop. Otherwise capture the printed `#{operationNumber} {title}` for context.

4. **Resolve operation directory**: Run `naholo agent op-path` to get the absolute operation directory; call this `{operationDir}`.

5. **Read local state** (for context when generating the summary log):
   - `{operationDir}/OBJECTIVES.md`
   - `{operationDir}/notes/OPERATION.md`
   - `{operationDir}/notes/TIMELINE.md`

6. **Push via CLI**: Run `naholo agent push` using the Bash tool. The push includes `TIMELINE.md` as just-another-note. Read the CLI output to know what was synced.

7. **Post summary log**: Generate a diff summary and post via `create_operation_log` MCP tool.

   **The first line MUST start with the literal sync signal `**sitrep** — ` (bold word, em-dash, single space).** `/infil` keys off this prefix to detect and skip sync echoes on re-infil — without it, the next infil will re-mirror this log as a new TIMELINE bullet (duplicate info).

   Format:

   ```
   **sitrep** — {one-sentence headline: synced {N} objectives, {N} notes; what's the state}

   - {optional bullets: objectives completed, objectives added/revised, notes touched, code-change summary from `git diff --stat` or OPERATION.md AARs}
   - {any freeform context the user provided}
   ```

8. **Append TIMELINE bullet**: Append a single bullet to `{operationDir}/notes/TIMELINE.md`: `- **{YYYY-MM-DD HH:MM} — sitrep**: Synced {N} objectives, {N} notes. {brief summary}`. Do NOT append to OPERATION.md — TIMELINE.md is the only file that gets chronological bullets.

9. **Print summary**: Output what was synced to chat. Use markdown link syntax with the absolute paths so the user can click to open them. When listing notes, use the fixed order: OPERATION → OBJECTIVES → TIMELINE first, then other notes alphabetically. Print as raw markdown — no surrounding fence.

## Rules

- **Do NOT close the operation** — sitrep is a checkpoint, not a finish line.
- **Do NOT clean up the local directory** — leave `{operationDir}` intact for continued work.
- **Do NOT modify source files** — sitrep is a sync operation only.
- **Use `naholo agent push` for all syncing** — do not manually call MCP tools for syncing objectives or notes, or manage `.base/` files. The CLI handles all of this.
- **TIMELINE.md is the only file that gets the new bullet** — OPERATION.md keeps SITUATION / MISSION / EXECUTION only.
- **Always post the summary log** — the log is the checkpoint record.
- Print the summary as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with the absolute path from `naholo agent op-path`.
