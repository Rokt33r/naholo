---
name: sitrep
description: Sync local progress to Naholo and post a one-sentence status log; does not close or clean up.
argument-hint: '["freeform"]'
model: sonnet
---

# Sitrep — Sync Progress

Thin wrapper around `naholo agent sitrep`. The CLI command owns the push (tasks + notes including TIMELINE.md) and the operation-log post — this skill composes the one-sentence status line and delegates.

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op`.

Anything in quotes is optional freeform context. When given, it replaces the `next:` clause of the log verbatim. Most invocations have no args.

## What to do

1. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

2. **Load manual**: If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules. Otherwise skip.

3. **Find infiled operation**: Run `naholo agent op`. If it errors with "No infiled operation", tell the user to run `/infil {operationNumber}` first and stop. Otherwise capture the printed `#{operationNumber} {title}` for context.

4. **Compose the log content** — a single line in this exact shape:

   ```
   **sitrep** — phase: {warno|opord|splash}, next: {short imperative — e.g. "/splash to ship TASK 3", "/opord to revise TASK 4", "review AAR"}.
   ```

   - `phase` is the most recent phase-changing skill that ran in this session (`/warno`, `/opord`, or `/splash`).
   - `next` is the obvious next step from `TASKS.md` + `OPERATION.md` state. If freeform args were passed, use them verbatim as the `next:` clause.
   - The `**sitrep** — ` prefix is mandatory — `/infil` keys off it to skip sync echoes when re-infiling.

5. **Run `naholo agent sitrep --log "<content>"`** with the composed line. On non-zero exit, surface the CLI's error and stop — the local dir is preserved.

6. **Print the confirmation** as raw markdown (no surrounding fence):

   ```
   Sitrep synced for OP #{operationNumber}.
   ```

## Rules

- **Sitrep is sync-only** — no source-file edits, no close, no local-dir cleanup.
- **`naholo agent sitrep` owns the push and the log post** — the skill's only CLI calls are `naholo agent op` and `naholo agent sitrep --log`.
- **The `**sitrep** — ` prefix on the log content is mandatory** — `/infil` uses it to detect and skip sync echoes.
- Print the confirmation as raw markdown — no surrounding fence.
