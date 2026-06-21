---
name: sitrep
description: Sync local progress to Naholo and post a one-sentence status log; does not close or clean up.
argument-hint: '["freeform"]'
---

# Sitrep — Sync Progress

Thin wrapper around `naholo agent sitrep`. The CLI command owns the push (tasks + notes including TIMELINE.md) and the operation-log post — this skill composes the one-sentence status line and delegates.

## Arguments

Anything in quotes is optional freeform context. When given, it replaces the `next:` clause of the log verbatim. Most invocations have no args.

## What to do

### 1. Boot

**If you haven't run `naholo agent boot` in this session**, run it now via the Bash tool. Adopt `<personality>` as your voice when the block is present, adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}`.

**If boot already ran this session**, run `naholo agent op` instead — treat its `<op_status>` payload as the current op status.

If `<op_status>` carries `No infilled operation.`, tell the user to run `/infil <opNum>` first and stop.

`<op_status>` carries `currentOp` / `opTitle` / `opNotes` — read from it whenever this skill needs them.

### 2. Load context

Read these now:

- `{operationDir}/notes/OPERATION.md` — the live OP document; re-read every invocation so manual mid-session edits land
- `{operationDir}/TASKS.md` — the checklist
- `{operationDir}/notes/TIMELINE.md` — **first session-boot only**; never re-read after that (it's a fresh-session catch-up doc, not in-session state)

### 3. Compose the log content

A single line in this exact shape:

```
**sitrep** — phase: {warno|opord|splash}, next: {short imperative — e.g. "/splash to ship TASK 3", "/opord to revise TASK 4", "review AAR"}.
```

- `phase` is the most recent phase-changing skill that ran in this session (`/warno`, `/opord`, or `/splash`).
- `next` is the obvious next step from `TASKS.md` + `OPERATION.md` state. If freeform args were passed, use them verbatim as the `next:` clause.
- The `**sitrep** — ` prefix is mandatory — `/infil` keys off it to skip sync echoes when re-infiling.

### 4. Run `naholo agent sitrep --log "<content>"`

Run with the composed line. On non-zero exit, surface the CLI's error and stop — the local dir is preserved.

### 5. Print the confirmation

Print as raw markdown (no surrounding fence):

```
Sitrep synced for OP #{currentOp}.
```

## Rules

- **Sitrep is sync-only** — no source-file edits, no close, no local-dir cleanup.
- **`naholo agent sitrep` owns the push and the log post** — the skill's only CLI calls are `naholo agent boot` and `naholo agent sitrep --log`.
- **The `**sitrep** — ` prefix on the log content is mandatory** — `/infil` uses it to detect and skip sync echoes.
- Print the confirmation as raw markdown — no surrounding fence.
