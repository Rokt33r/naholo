---
name: exfil
description: Sync local operation changes back to Naholo and clean up — pushes tasks/notes, drains transcripts, posts a log, optionally closes, removes the infilled dir.
argument-hint: '["freeform"]'
---

# Exfil — Sync Back and Clean Up

Thin wrapper around `naholo agent exfil`. The CLI command does the work; this skill resolves the close decision with the user and prints the completion line.

## Arguments

Anything in quotes is optional freeform context. It overrides the close decision only when it explicitly states one — "close" / "close it" → close; "don't close" / "leave it open" → leave open. Freeform that doesn't explicitly say either does not override; the task-state default in step 4 applies.

## What to do

### 1. Boot

**If you haven't run `naholo agent boot` in this session**, run it now via the Bash tool. Adopt `<personality>` as your voice when the block is present, adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}`.

**If boot already ran this session**, run `naholo agent op` instead — treat its `<op_status>` payload as the current op status.

If `<op_status>` carries `No infilled operation.`, tell the user there's no infilled operation to exfil and stop.

`<op_status>` carries `currentOp` / `opTitle` / `opNotes` — read from it whenever this skill needs them.

### 2. Load context

Read these now:

- `{operationDir}/notes/OPERATION.md` — the live OP document; re-read every invocation so manual mid-session edits land
- `{operationDir}/TASKS.md` — the checklist
- `{operationDir}/notes/TIMELINE.md` — **first session-boot only**; never re-read after that (it's a fresh-session catch-up doc, not in-session state)

### 3. Check for unchecked tasks

Count unchecked (`- [ ]`) tasks in `TASKS.md`. If any exist, use `AskUserQuestion` to warn: "Heads up — {count} tasks still incomplete. Proceed with exfil anyway?" Do NOT proceed until they respond.

- If **no** → abort. Print that exfil was aborted and local data is preserved at `{operationDir}`.
- If **yes** → continue.

### 4. Resolve close intent

An explicit close/leave-open statement in the args overrides; otherwise the decision falls to task state.

- Args explicitly say close → close.
- Args explicitly say leave open → leave open.
- No explicit statement, all tasks in TASKS.md done → close (no need to ask).
- No explicit statement, tasks still unchecked → use `AskUserQuestion`: "Close operation #{currentOp}?" Do NOT proceed until they respond.

### 5. Run `naholo agent exfil`

Pass `--close` when closing, no flag when leaving open. On non-zero exit, surface the CLI's error and stop — the local dir is preserved by the CLI on every failure path. On success, capture the last line of stdout as `{url}`.

### 6. Print the completion line

Output template:

```md
Exfil complete — [OP #{currentOp}: "{opTitle}"]({url})
```

## Rules

- **Exfil is sync-only** — no source-file edits in this skill.
- **`naholo agent exfil` owns push, transcript drain, log post, optional close, and local-dir removal** — the skill's only CLI calls are `naholo agent boot` and `naholo agent exfil`.
- Print the completion line as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — substitute `{operationDir}` with `opPath` from boot's `<op_status>`. The `{url}` in the completion line is a real `https://` URL and is exempt.
