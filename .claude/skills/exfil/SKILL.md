---
name: exfil
description: Sync local operation changes back to Naholo — push objectives and notes (including TIMELINE.md), post summary log, optionally close.
argument-hint: '["close"|"don\'t close"|"freeform"]'
model: sonnet
---

# Exfil — Sync Back and Clean Up

Sync local changes back to Naholo, post a summary log, and clean up the local working directory.

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op-list` (asks if multiple).

Anything in quotes is optional freeform context. Common patterns:

- `"close"` — close the operation after syncing
- `"don't close"` — sync but leave operation open
- Anything else → treat as extra context for the summary log; ask the user whether to close.

If no instructions given, ask the user whether to close.

## What to do

1. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

2. **Load manual**: If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

3. **Find infiled operation**: Run `naholo agent op-list`.
   - If none exist → tell user there's no infiled operation to exfil.
   - If multiple exist → show the list and ask user which one.

4. **Resolve operation directory**: Run `naholo agent op-path {operationNumber}` to get the absolute operation directory; call this `{operationDir}`. If `{operationDir}` does not exist on disk, tell the user there's nothing to exfil for that operation and stop.

5. **Read local state** (for context when generating the summary log):
   - `{operationDir}/OBJECTIVES.md`
   - `{operationDir}/notes/OPERATION.md`
   - `{operationDir}/notes/TIMELINE.md`

6. **Check for remaining objectives**: Check `OBJECTIVES.md` for any unchecked (`- [ ]`) objectives.
   - If there are incomplete objectives → use `AskUserQuestion` to warn: "Heads up — {count} objectives still incomplete. Proceed with exfil anyway?" Do NOT proceed until they respond.
     - If the user says **no** → abort exfil. Do not push, close, or clean up. Preserve local data at `{operationDir}`. Print that exfil was aborted and local data is preserved.
     - If the user says **yes** → continue to step 7.
   - If all objectives are done → continue to step 7.

7. **Push via CLI**: Run `naholo agent push {operationNumber}` using the Bash tool. The push includes `TIMELINE.md` as just-another-note.

   **If `naholo agent push` fails (non-zero exit code) → STOP. Do NOT proceed to step 8.** Print the error and preserve local data (see step 11 failure path).

8. **Post summary log**: Generate a diff summary and post via `create_operation_log` MCP tool. Include:
   - Objectives completed (names)
   - Notes created or updated
   - Brief description of code changes (summarize from OPERATION.md AARs)
   - Any freeform context the user provided

   **If `create_operation_log` fails → STOP. Do NOT proceed to step 9.** Report the error and preserve local data (see step 11 failure path).

9. **Append TIMELINE bullet**: Append a single bullet to `{operationDir}/notes/TIMELINE.md`: `- **{YYYY-MM-DD HH:MM} — exfil**: Final sync — {brief summary}.` Do NOT append to OPERATION.md.

10. **Close or ask about closing**:
    - If extra instructions already specify → follow them.
    - If all objectives in OBJECTIVES.md are done → close automatically via `close_operation` MCP tool (no need to ask).
    - Otherwise → use `AskUserQuestion` to ask: "Close operation #{operationNumber}?" Do NOT proceed until they respond.
      - If yes → use `close_operation` MCP tool
      - If no → leave open

11. **Clean up or abort**:
    - **If push and summary log completed successfully**: Delete the `{operationDir}` directory.
    - **If any step failed**: Do NOT delete. Instead:
      - Print which step failed and what the error was
      - Confirm that local data at `{operationDir}` is preserved
      - Suggest the user retry with `/exfil`

12. **Print summary**: Print the exfil report as raw markdown — no surrounding fence. Report what was pushed, whether the operation closed, and whether the local dir was deleted or preserved. When linking to files, use the absolute paths from step 4.

## Rules

- **Do NOT modify source files** — exfil is a sync operation only.
- **Use `naholo agent push` for all syncing** — do not manually call MCP tools for syncing objectives or notes, or manage `.base/` files. The CLI handles all of this.
- **TIMELINE.md is the only file that gets the new bullet** — OPERATION.md keeps SITUATION / MISSION / EXECUTION only.
- **Always post the summary log** before closing or cleaning up — the log is the permanent record of what happened during this infil session.
- Print the summary as raw markdown — no surrounding fence.
