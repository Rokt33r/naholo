---
name: exfil
description: Sync local operation changes back to Naholo — push tasks and notes (including TIMELINE.md), post summary log, optionally close.
argument-hint: '["close"|"don\'t close"|"freeform"]'
model: sonnet
---

# Exfil — Sync Back and Clean Up

Sync local changes back to Naholo, post a summary log, and clean up the local working directory.

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op`, the local dir via `naholo agent op-path`, and the web-app URL via `naholo agent op-url`.

Anything in quotes is optional freeform context. Common patterns:

- `"close"` — close the operation after syncing
- `"don't close"` — sync but leave operation open
- Anything else → treat as extra context for the summary log; ask the user whether to close.

If no instructions given, ask the user whether to close.

## What to do

1. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

2. **Load manual**: If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

3. **Find infiled operation**: Run `naholo agent op`. If it errors with "No infiled operation", tell the user there's no infiled operation to exfil and stop. Otherwise capture the printed `#{operationNumber} {title}` for context.

4. **Resolve operation directory**: Run `naholo agent op-path` to get the absolute operation directory; call this `{operationDir}`.

5. **Read local state** (for context when generating the summary log):
   - `{operationDir}/TASKS.md`
   - `{operationDir}/notes/OPERATION.md`

6. **Check for remaining tasks**: Check `TASKS.md` for any unchecked (`- [ ]`) tasks.
   - If there are incomplete tasks → use `AskUserQuestion` to warn: "Heads up — {count} tasks still incomplete. Proceed with exfil anyway?" Do NOT proceed until they respond.
     - If the user says **no** → abort exfil. Do not push, close, or clean up. Preserve local data at `{operationDir}`. Print that exfil was aborted and local data is preserved.
     - If the user says **yes** → continue to step 7.
   - If all tasks are done → continue to step 7.

7. **Push via CLI**: Run `naholo agent push` using the Bash tool. The push includes `TIMELINE.md` as just-another-note.

   **If `naholo agent push` fails (non-zero exit code) → STOP. Do NOT proceed to step 8.** Print the error and preserve local data (see step 11 failure path).

8. **Post summary log**: Post via `create_operation_log` MCP tool. Format is **header line + one short bullet per task (≤1 sentence each)**, paraphrased from each task's `#### Intent` and `#### Course of Action` in `{operationDir}/notes/OPERATION.md` (and the AAR's `**Deviations**` when the task shipped with non-trivial deviations). Don't re-narrate; compress aggressively. If the user gave freeform context, append it after the bullets.

   **The first line MUST start with the literal sync signal `**exfil** — ` (bold word, em-dash, single space).** `/infil` keys off this prefix to detect and skip sync echoes on re-infil — without it, the next infil will re-mirror this log as a new TIMELINE bullet (duplicate info).

   Example for a 3-task operation:

   ```
   **exfil** — OP #128 shipped, 3 tasks squashed.

   - Renamed `.claude/skills/plan/` → `.claude/skills/opord/` via `git mv`, patched the settings allowlist.
   - Swept every `/plan` mention to `/opord` across the five SKILL.md files + `manual.md` (final grep is clean).
   - Restructured `docs/ai-workflow.md` to a six-skill chain with a new Phase 4 for `/opord`.
   ```

   Example for a recon-only mid-cycle exfil (no tasks shipped):

   ```
   **exfil** — OP #66 paused mid-recon (blocked on OP #122); no tasks shipped.

   - MISSION fully drafted: single Stop hook → `naholo agent stats-record` (detached) → idempotent transcript upsert.
   - Notes pushed: OPERATION (SITUATION + MISSION), TIMELINE.
   ```

   **If `create_operation_log` fails → STOP. Do NOT proceed to step 9.** Report the error and preserve local data (see step 11 failure path).

9. **Append TIMELINE bullet**: Run `naholo agent add-timeline -T exfil 'Final sync — {brief summary}.'`. Do NOT append to OPERATION.md.

10. **Close or ask about closing**:
    - If extra instructions already specify → follow them.
    - If all tasks in TASKS.md are done → close automatically via `close_operation` MCP tool (no need to ask).
    - Otherwise → use `AskUserQuestion` to ask: "Close operation #{operationNumber}?" Do NOT proceed until they respond.
      - If yes → use `close_operation` MCP tool
      - If no → leave open

11. **Clean up or abort**:
    - **If push, summary log, and close all completed successfully**: Delete the `{operationDir}` directory with `rm -rf {operationDir}` via Bash.
    - **If any step failed**: Do NOT delete. Instead:
      - Print which step failed and what the error was
      - Confirm that local data at `{operationDir}` is preserved
      - Suggest the user retry with `/exfil`

12. **Print summary**: Run `naholo agent op-url` via Bash to capture `{url}`, then print the exfil report as raw markdown — no surrounding fence. Format:

    ```
    Exfil complete — [OP #{operationNumber}: "{title}"]({url})

    {N} tasks shipped · {closed|left open}
    ```

    Don't print log id, "Local dir deleted: …", or note-push enumeration on success — silence is fine. The failure path in step 11 is where preserved local data gets surfaced.

## Rules

- **Do NOT modify source files** — exfil is a sync operation only.
- **Use `naholo agent push` for all syncing** — do not manually call MCP tools for syncing tasks or notes, or manage `.base/` files. The CLI handles all of this.
- **TIMELINE.md is the only file that gets the new bullet** — OPERATION.md keeps SITUATION / MISSION / EXECUTION only.
- **Always post the summary log** before closing or cleaning up — the log is the permanent record of what happened during this infil session.
- **Summary log = header line + one short bullet per task (≤1 sentence each).** Paraphrase from each task's Intent + Course of Action (plus AAR Deviations when relevant); don't re-narrate the task. Short and forgettable beats comprehensive.
- Print the summary as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — e.g., `[preserved at](/Users/.../infiled/)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with the absolute path from `naholo agent op-path`. (The `op-url` web link in the success summary is a real `https://` URL and is exempt.)
