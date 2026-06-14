---
name: exfil
description: Sync local operation changes back to Naholo and clean up — pushes tasks/notes, drains transcripts, posts a log, optionally closes, removes the infiled dir.
argument-hint: '["close"|"don\'t close"|"freeform"]'
model: sonnet
---

# Exfil — Sync Back and Clean Up

Thin wrapper around `naholo agent exfil`. The CLI command owns the push, transcript drain, log post, optional close, and local-dir removal — this skill resolves the close decision with the user and prints the completion line.

## Arguments

Anything in quotes is optional context. Common patterns:

- `"close"` — close the operation after syncing
- `"don't close"` — sync but leave the operation open
- Anything else → ask the user whether to close

If no instructions are given, ask the user whether to close.

## What to do

### 1. Boot

**If you haven't run `naholo agent boot` in this session**, run it now via the Bash tool. Adopt `<personality>` as your voice when the block is present, adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}`.

**If boot already ran this session**, run `naholo agent op` instead — treat its `<op_status>` payload as the current op status.

If `<op_status>` carries `No infiled operation.`, tell the user there's no infiled operation to exfil and stop.

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

- Args contain `"close"` → close.
- Args contain `"don't close"` → leave open.
- All tasks in TASKS.md are done → close (no need to ask).
- Otherwise → use `AskUserQuestion`: "Close operation #{currentOp}?" Do NOT proceed until they respond.

### 5. Run `naholo agent exfil`

Pass `--close` when closing, no flag when leaving open. On non-zero exit, surface the CLI's error and stop — the local dir is preserved by the CLI on every failure path. On success, capture the last line of stdout as `{url}`.

### 6. Print the completion line

Print as raw markdown (no surrounding fence):

```
Exfil complete — [OP #{currentOp}: "{opTitle}"]({url})
```

## Rules

- **Exfil is sync-only** — no source-file edits in this skill.
- **`naholo agent exfil` owns push, transcript drain, log post, optional close, and local-dir removal** — the skill's only CLI calls are `naholo agent boot` and `naholo agent exfil`.
- **The op URL is the last stdout line of `naholo agent exfil`** — capture it from there for the completion line.
- Print the completion line as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — substitute `{operationDir}` with `opPath` from boot's `<op_status>`. The `{url}` in the completion line is a real `https://` URL and is exempt.
