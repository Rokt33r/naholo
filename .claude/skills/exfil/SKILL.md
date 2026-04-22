---
name: exfil
description: Sync local operation changes back to Naholo — push objectives, notes, post summary log, optionally close.
argument-hint: '[operationNumber] ["extra instructions in quotes"]'
model: sonnet
---

# Exfil — Sync Back and Clean Up

Sync local changes back to Naholo, post a summary log, and clean up the local working directory.

## Arguments

Optional operation number as first token (e.g., `42`). If provided, use `.naholo/local/operations/42/` directly — if that directory doesn't exist, tell the user there's nothing to exfil for that operation.

Anything after in quotes is extra instructions. Common patterns:

- `"close"` — close the operation after syncing
- `"don't close"` — sync but leave operation open

If no instructions given, ask the user whether to close.

## What to do

0. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

0.5. **Load manual**: If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

1. **Find infiled operation**: If an operation number was provided, use it. Otherwise read the MCP resource `naholo://local/operations` to list infiled operations.
   - If none exist → tell user there's no infiled operation to exfil.
   - If multiple exist → show the list and ask user which one.

2. **Read local state** (for context when generating the summary log):
   - `.naholo/local/operations/{operationNumber}/OBJECTIVES.md`
   - `.naholo/local/operations/{operationNumber}/notes/OPERATION.md`

3. **Check for remaining objectives**: Check `OBJECTIVES.md` for any unchecked (`- [ ]`) objectives.
   - If there are incomplete objectives → use `AskUserQuestion` to warn: "Heads up — {count} objectives still incomplete. Proceed with exfil anyway?" Do NOT proceed until they respond.
     - If the user says **no** → abort exfil. Do not push, close, or clean up. Preserve local data at `.naholo/local/operations/{operationNumber}/`. Print that exfil was aborted and local data is preserved.
     - If the user says **yes** → continue to step 4.
   - If all objectives are done → continue to step 4.

4. **Push via CLI**: Run `naholo agent push {operationNumber}` using the Bash tool.

   **If `naholo agent push` fails (non-zero exit code) → STOP. Do NOT proceed to step 5.** Report the error and preserve local data (see step 7 failure path).

5. **Post summary log**: Generate a diff summary and post via `create_operation_log` MCP tool. Include:
   - Objectives completed (count and names)
   - Objectives added (count and names)
   - Notes created or updated
   - Brief description of code changes (summarize from SPEC.md/OPERATION.md progress)
   - **If `create_operation_log` fails → STOP. Do NOT proceed to step 6.** Report the error and preserve local data (see step 7 failure path).

6. **Close or ask about closing**:
   - If extra instructions already specify → follow them.
   - If all objectives in OBJECTIVES.md are done → close automatically via `close_operation` MCP tool (no need to ask).
   - Otherwise → use `AskUserQuestion` to ask: "Close operation #{operationNumber}?" Do NOT proceed until they respond.
     - If yes → use `close_operation` MCP tool
     - If no → leave open

7. **Clean up or abort**:
   - **If push and summary log completed successfully**: Delete the `.naholo/local/operations/{operationNumber}/` directory.
   - **If any step failed**: Do NOT delete. Instead:
     - Print which step failed and what the error was
     - Confirm that local data at `.naholo/local/operations/{operationNumber}/` is preserved
     - Suggest the user retry with `/exfil`

8. **Print summary**: Print the exfil report as raw markdown — no surrounding fence. Report what was pushed, whether the operation closed, and whether the local dir was deleted or preserved.

## Rules

- **Do NOT implement any code** — only sync state and clean up.
- **Do NOT modify source files** — exfil is a sync operation only.
- **Use `naholo agent push` for all syncing** — do not manually call MCP tools for syncing objectives or notes, or manage `.base/` files. The CLI handles all of this.
- **Always post the summary log** before closing or cleaning up — the log is the permanent record of what happened during this infil session.
- Print the summary as raw markdown — no surrounding fence.
