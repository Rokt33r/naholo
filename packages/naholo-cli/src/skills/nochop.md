---
name: nochop
description: Discard the in-flight CHOP proposal. Deletes `notes/CHOP.md` from both the local infilled dir and the parent OP server-side, stamps TIMELINE, and points the user at the next action based on the parent's `OPERATION.md` state. The parent OP's WARNING ORDER/OPERATION ORDER are not modified.
argument-hint: ''
---

# Nochop — Abort the CHOP

The bail-out half of the OP-splitting workflow. `/nochop` exists for the case where `/chop` drafted a proposal that the user no longer wants — wrong cleave line, new info from the codebase, scope changed, whatever. It deletes `notes/CHOP.md` locally and removes the same note from the parent OP server-side, stamps a TIMELINE event, and ends the chop phase. The parent OP's `WARNING ORDER` / `OPERATION ORDER` / `TASKS.md` are untouched.

This skill takes no args. It is a one-line cleanup, not a planning skill.

## Arguments

None.

## What to do

### 1. Boot

**If you haven't run `naholo agent boot` in this session**, run it now via the Bash tool. Adopt `<personality>` as your voice when the block is present, adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}` — the parent operation directory.

**If boot already ran this session**, run `naholo agent op` instead — treat its `<op_status>` payload as the current op status.

If `<op_status>` carries `No infilled operation.`, tell the user to run `/infil <opNum>` first and abort.

`<op_status>` carries `currentOp` / `opTitle` / `opNotes` — read from it whenever this skill needs them (`currentOp` / `opTitle` give the parent OP's `{parentNumber}` / `{parentTitle}`).

### 2. Load context

Read these now:

- `{operationDir}/notes/CHOP.md` — **required**. If missing, abort. Print as raw markdown (no surrounding fence) and stop:

  > No CHOP proposal in flight. `/nochop` only applies when `notes/CHOP.md` exists.

- `{operationDir}/notes/OPERATION.md` — re-read every invocation so manual mid-session edits land; needed for the next-action mode in step 5
- `{operationDir}/TASKS.md` — same
- `{operationDir}/notes/TIMELINE.md` — **first session-boot only**; never re-read after that

### 3. Delete `CHOP.md` (local and server)

Discard the proposal on both sides:

- **Server first**: call `mcp__naholo__delete_note` with `operationNumber: {parentNumber}`, `name: 'CHOP'`. Swallow a 404 silently — the proposal may never have been `/sitrep`-ed to the server.
- **Local second**: delete `{operationDir}/notes/CHOP.md` from the infilled dir.

Server before local prevents the next `/sitrep` from re-pushing a lingering local file if the server delete fails.

### 4. Stamp TIMELINE

Run:

```
naholo agent add-timeline -T nochop 'Discarded CHOP proposal.'
```

### 5. Determine next-action mode

From the OPERATION.md + TASKS.md already loaded in step 2, pick one of:

- **`mission-only`** — `## OPERATION ORDER` is absent on the parent, or present but contains zero `### TASK n —` sections.
- **`execution-ready`** — `## OPERATION ORDER` exists and `TASKS.md` has at least one `- [ ]` row.
- **`all-shipped`** — `## OPERATION ORDER` exists and every `TASKS.md` row is `- [x]`. The parent is finished and ready to close out.

### 6. Print summary

Show the result. Use markdown link syntax. Print as raw markdown — no surrounding fence.

**Heading line** (always printed):

> CHOP discarded on [OP #{parentNumber}: {parentTitle}]({operationDir}/notes/OPERATION.md). Parent unchanged.

**Then append the next-actions block** that matches the mode you determined in step 5.

`mission-only`:

> Next:
>
> - `/warno "freeform"` — adjust [WARNING ORDER]({operationDir}/notes/OPERATION.md#L<warning-order-line>) on the parent.
> - `/opord` — cut the parent [WARNING ORDER]({operationDir}/notes/OPERATION.md#L<warning-order-line>) into OPERATION ORDER tasks.

`execution-ready`:

> Next:
>
> - `/opord "freeform"` — revise the parent's [OPERATION ORDER]({operationDir}/notes/OPERATION.md#L<operation-order-line>) (insert / drop / rewrite unfinished tasks).
> - `/splash` — ship [TASK {N} — {title}]({operationDir}/notes/OPERATION.md#L<task-line>)

TASK {N} should be the first unchecked task.

`all-shipped`:

> Next:
>
> - `/exfil` — every task on the parent is shipped; sync and close out the operation.

For `all-shipped`, do not append `/warno`, `/opord`, `/splash`, `/sitrep`, or any other skill — just the single `/exfil` bullet. For `mission-only` and `execution-ready`, the listed bullets are the only next-step pointers; do not invent additional options.

Line-anchor resolution (per the manual's `### Link format`):

- `<warning-order-line>` — locate the `## WARNING ORDER` heading in `OPERATION.md`.
- `<operation-order-line>` — locate the `## OPERATION ORDER` heading.
- `<task-line>` (only needed for `execution-ready`) — pick the first `- [ ] {N}. {title}` row from `TASKS.md` in source order. Substitute `{N}` and `{title}` in the `/splash` bullet from that row, then locate `### TASK {N} — {title}` in `OPERATION.md` and use that heading's line. By construction, `execution-ready` guarantees at least one unchecked row exists.

## Post-nochop phase

`/nochop` **ends the chop phase**. No new phase begins automatically — the next phase is the user's choice, picked by invoking the appropriate skill. Do not infer a phase from `OPERATION.md` state and act as if it had been entered.

If the user asks for follow-up work on the parent without explicitly invoking a skill, **push back once**. Surface the skill that owns the work — picking the most plausible suggestion from the prompt, or from the parent's mode determined in step 5 (`mission-only` / `execution-ready` / `all-shipped`) if the prompt is ambiguous — and wait for them to invoke it. Common mappings:

- Rewriting parent `## WARNING ORDER` → suggest `/warno "..."`
- Cutting tasks / editing parent `## OPERATION ORDER` or `TASKS.md` → suggest `/opord "..."`
- Implementing a parent task → suggest `/splash {N}`
- Drafting a fresh chop → suggest `/chop "..."`
- Pushing to the server → suggest `/sitrep` (checkpoint) or `/exfil` (final)

If the user pushes back, rephrases the request, or otherwise signals they want the work done without invoking the suggested skill, **treat that as an explicit override and do the work directly**. The one-time push-back is a check, not a wall — the escape hatch stays open.

## Rules

- **No args** — `/nochop` accepts no freeform input.
- **No parent OP modification** — only `CHOP.md` (local + server-side) and `TIMELINE.md` are touched. `OPERATION.md` and `TASKS.md` are not.
- **`CHOP.md` is mandatory** — if it's already absent, the skill is a no-op and stops with the abort message in step 2.
- **Use the inlined next-action template** — do not improvise the next-action lines. Pick the `mission-only` or `execution-ready` block in step 6 verbatim; do not list `/sitrep`, `/exfil`, or any other skill.
- **Always use absolute filesystem paths in link targets** — substitute `{operationDir}` literally with `opPath` from boot's `<op_status>`.
- Print the summary as raw markdown — no surrounding fence.
