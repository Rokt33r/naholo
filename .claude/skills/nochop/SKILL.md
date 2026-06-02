---
name: nochop
description: Discard the in-flight CHOP proposal. Deletes `notes/CHOP.md` from both the local infiled dir and the parent OP server-side, stamps TIMELINE, and points the user at the next action based on the parent's `OPERATION.md` state. The parent OP's MISSION/EXECUTION are not modified.
argument-hint: ''
---

# Nochop — Abort the CHOP

The bail-out half of the OP-splitting workflow. `/nochop` exists for the case where `/chop` drafted a proposal that the user no longer wants — wrong cleave line, new info from the codebase, scope changed, whatever. It deletes `notes/CHOP.md` locally and removes the same note from the parent OP server-side, stamps a TIMELINE event, and ends the chop phase. The parent OP's `MISSION` / `EXECUTION` / `TASKS.md` are untouched.

This skill takes no args. It is a one-line cleanup, not a planning skill.

## Arguments

None.

## What to do

### 1. Load personality

If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

### 2. Load manual

If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules. Otherwise skip.

### 3. Find infiled operation

Run `naholo agent op`. If it errors with "No infiled operation", tell the user to run `/infil {operationNumber}` first and abort. Capture `#{parentNumber} {parentTitle}`.

### 4. Resolve operation directory

Run `naholo agent op-path`; call the result `{operationDir}`.

### 5. Check `CHOP.md` exists

If `{operationDir}/notes/CHOP.md` is missing, abort. Nothing to discard. Print:

> No CHOP proposal in flight. `/nochop` only applies when `notes/CHOP.md` exists.

Then stop.

### 6. Delete `CHOP.md` (local and server)

Discard the proposal on both sides:

- **Server first**: call `mcp__naholo__delete_note` with `operationNumber: {parentNumber}`, `name: 'CHOP'`. Swallow a 404 silently — the proposal may never have been `/sitrep`-ed to the server.
- **Local second**: delete `{operationDir}/notes/CHOP.md` from the infiled dir.

Server before local prevents the next `/sitrep` from re-pushing a lingering local file if the server delete fails.

### 7. Stamp TIMELINE

Run:

```
naholo agent add-timeline -T nochop 'Discarded CHOP proposal.'
```

### 8. Read parent state for next-action mode

Read `{operationDir}/notes/OPERATION.md` and `{operationDir}/TASKS.md`. The first determines whether EXECUTION exists; the second tells you whether any task is still unchecked.

- **`mission-only`** — `## EXECUTION` is absent on the parent, or present but contains zero `### TASK n —` sections.
- **`execution-ready`** — `## EXECUTION` exists and `TASKS.md` has at least one `- [ ]` row.
- **`all-shipped`** — `## EXECUTION` exists and every `TASKS.md` row is `- [x]`. The parent is finished and ready to close out.

### 9. Print summary

Show the result. Use markdown link syntax. Print as raw markdown — no surrounding fence.

**Heading line** (always printed):

> CHOP discarded on [OP #{parentNumber}: {parentTitle}]({operationDir}/notes/OPERATION.md). Parent unchanged.

**Then append the next-actions block** that matches the mode you determined in step 8.

`mission-only`:

> Next:
>
> - `/warno "freeform"` — adjust [MISSION]({operationDir}/notes/OPERATION.md#L<mission-line>) on the parent.
> - `/opord` — cut the parent [MISSION]({operationDir}/notes/OPERATION.md#L<mission-line>) into EXECUTION tasks.

`execution-ready`:

> Next:
>
> - `/opord "freeform"` — revise the parent's [EXECUTION]({operationDir}/notes/OPERATION.md#L<execution-line>) (insert / drop / rewrite unfinished tasks).
> - `/splash` — ship [TASK {N} — {title}]({operationDir}/notes/OPERATION.md#L<task-line>)

TASK {N} should be the first unchecked task.

`all-shipped`:

> Next:
>
> - `/exfil` — every task on the parent is shipped; sync and close out the operation.

For `all-shipped`, do not append `/warno`, `/opord`, `/splash`, `/sitrep`, or any other skill — just the single `/exfil` bullet. For `mission-only` and `execution-ready`, the listed bullets are the only next-step pointers; do not invent additional options.

Line-anchor resolution (per the manual's `### Link format`):

- `<mission-line>` — locate the `## MISSION` heading in `OPERATION.md`.
- `<execution-line>` — locate the `## EXECUTION` heading.
- `<task-line>` (only needed for `execution-ready`) — pick the first `- [ ] {N}. {title}` row from `TASKS.md` in source order. Substitute `{N}` and `{title}` in the `/splash` bullet from that row, then locate `### TASK {N} — {title}` in `OPERATION.md` and use that heading's line. By construction, `execution-ready` guarantees at least one unchecked row exists.

## Post-nochop phase

`/nochop` **ends the chop phase**. No new phase begins automatically — the next phase is the user's choice, picked by invoking the appropriate skill. Do not infer a phase from `OPERATION.md` state and act as if it had been entered.

If the user asks for follow-up work on the parent without explicitly invoking a skill, **push back once**. Surface the skill that owns the work — picking the most plausible suggestion from the prompt, or from the parent's mode determined in step 8 (`mission-only` / `execution-ready` / `all-shipped`) if the prompt is ambiguous — and wait for them to invoke it. Common mappings:

- Rewriting parent `## MISSION` → suggest `/warno "..."`
- Cutting tasks / editing parent `## EXECUTION` or `TASKS.md` → suggest `/opord "..."`
- Implementing a parent task → suggest `/splash {N}`
- Drafting a fresh chop → suggest `/chop "..."`
- Pushing to the server → suggest `/sitrep` (checkpoint) or `/exfil` (final)

If the user pushes back, rephrases the request, or otherwise signals they want the work done without invoking the suggested skill, **treat that as an explicit override and do the work directly**. The one-time push-back is a check, not a wall — the escape hatch stays open.

## Rules

- **No args** — `/nochop` accepts no freeform input.
- **No parent OP modification** — only `CHOP.md` (local + server-side) and `TIMELINE.md` are touched. `OPERATION.md` and `TASKS.md` are not.
- **`CHOP.md` is mandatory** — if it's already absent, the skill is a no-op and stops with the abort message in step 5.
- **Use the inlined next-action template** — do not improvise the next-action lines. Pick the `mission-only` or `execution-ready` block in step 9 verbatim; do not list `/sitrep`, `/exfil`, or any other skill.
- **Always use absolute filesystem paths in link targets** — substitute `{operationDir}` literally with the absolute path from `naholo agent op-path`.
- Print the summary as raw markdown — no surrounding fence.
