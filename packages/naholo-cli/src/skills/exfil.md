---
name: exfil
description: Sync local operation changes back to Naholo and clean up — pushes tasks/notes, drains transcripts, posts a log, optionally closes, removes the infiled dir.
argument-hint: '["close"|"don\'t close"|"freeform"]'
model: sonnet
---

# Exfil — Sync Back and Clean Up

Thin wrapper around `naholo agent exfil`. The CLI command owns the push, transcript drain, log post, optional close, and local-dir removal — this skill resolves the close decision with the user and prints the completion line.

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op`.

Anything in quotes is optional context. Common patterns:

- `"close"` — close the operation after syncing
- `"don't close"` — sync but leave the operation open
- Anything else → ask the user whether to close

If no instructions are given, ask the user whether to close.

## What to do

1. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

2. **Load manual**: If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules. Otherwise skip.

3. **Find infiled operation**: Run `naholo agent op`. If it errors with "No infiled operation", tell the user there's no infiled operation to exfil and stop. Otherwise capture the printed `#{operationNumber} {title}` for context.

4. **Check for unchecked tasks**: Read `{operationDir}/TASKS.md` (resolve `{operationDir}` via `naholo agent op-path`) and count unchecked (`- [ ]`) tasks. If any exist, use `AskUserQuestion` to warn: "Heads up — {count} tasks still incomplete. Proceed with exfil anyway?" Do NOT proceed until they respond.
   - If **no** → abort. Print that exfil was aborted and local data is preserved at `{operationDir}`.
   - If **yes** → continue.

5. **Resolve close intent**:
   - Args contain `"close"` → close.
   - Args contain `"don't close"` → leave open.
   - All tasks in TASKS.md are done → close (no need to ask).
   - Otherwise → use `AskUserQuestion`: "Close operation #{operationNumber}?" Do NOT proceed until they respond.

6. **Run `naholo agent exfil`**: Pass `--close` when closing, no flag when leaving open. On non-zero exit, surface the CLI's error and stop — the local dir is preserved by the CLI on every failure path. On success, capture the last line of stdout as `{url}`.

7. **Print the completion line** as raw markdown (no surrounding fence):

   ```
   Exfil complete — [OP #{operationNumber}: "{title}"]({url})
   ```

## Rules

- **Exfil is sync-only** — no source-file edits in this skill.
- **`naholo agent exfil` owns push, transcript drain, log post, optional close, and local-dir removal** — the skill's only CLI calls are `naholo agent op`, `naholo agent op-path`, and `naholo agent exfil`.
- **The op URL is the last stdout line of `naholo agent exfil`** — capture it from there for the completion line.
- Print the completion line as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — substitute `{operationDir}` with the absolute path from `naholo agent op-path`. The `{url}` in the completion line is a real `https://` URL and is exempt.
