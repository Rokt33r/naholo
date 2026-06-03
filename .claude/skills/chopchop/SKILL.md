---
name: chopchop
description: Apply the CHOP proposal — spawn the new OP server-side with seeded SITUATION + MISSION + EXECUTION + tasks, prune the carved scope from the parent's local OPERATION.md / TASKS.md, allocate TRP across both OPs, and delete CHOP.md from both the local infiled dir and the parent OP server-side. Run after `/chop` produces `notes/CHOP.md` and the user has reviewed it.
argument-hint: ''
---

# Chopchop — Apply the CHOP

The second half of the OP-splitting workflow. `/chopchop` reads `notes/CHOP.md` (drafted by `/chop` and possibly hand-edited by the user), creates the new operation on the server, seeds its `OPERATION.md` + tasks with the carved content, prunes the same scope from the parent's local `OPERATION.md` and `TASKS.md`, allocates TRP across both OPs, and deletes `CHOP.md`. After `/chopchop`, the parent stays infiled in whatever phase it was already in; the new OP exists server-side only until someone runs `/exfil` on the parent and `/infil <newNumber>` in a fresh session.

This skill takes no freeform args — everything it needs is in `CHOP.md`. The user's editing pass on `CHOP.md` between `/chop` and `/chopchop` is the only customization channel.

## Arguments

None. `/chopchop` always consumes `{operationDir}/notes/CHOP.md` as-is. If the user wants to change the split, they edit `CHOP.md` before running `/chopchop`.

## What to do

### 1. Load personality

If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

### 2. Load manual

If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules. Otherwise skip.

### 3. Find infiled operation

Run `naholo agent op`. If it errors with "No infiled operation", tell the user to run `/infil {operationNumber}` first and abort. Capture `#{parentNumber} {parentTitle}`.

### 4. Resolve operation directory

Run `naholo agent op-path`; call the result `{operationDir}`.

### 5. Read local state

Read:

- `{operationDir}/notes/CHOP.md` — required. If missing, stop and tell the user to run `/chop "freeform"` first.
- `{operationDir}/notes/OPERATION.md` — needed in full for verbatim task-section copy, TRP allocation, and the prune pass.
- `{operationDir}/TASKS.md` — needed to update the parent's checklist.

### 6. Validate `CHOP.md` (abort-before-modify gate)

Before any server call, any file edit, any TIMELINE write, read `CHOP.md` and the parent's `OPERATION.md` and confirm the proposal still refers to real, unambiguous symbols on the parent.

Read these blocks from `CHOP.md` (skip `## Intent` — it's a human-readable summary `/chop` writes for the user; `/chopchop` ignores it):

- The `# CURRENT OP …` block: post-split CoO, surviving WOs (verbatim), surviving task checklist. Each item is `- [ ] TASK n — {title}` or `- [x] TASK n — {title}` (em-dash separator, same shape as the parent's `### TASK n — {title}` heading) — checkbox state encodes shipped (`[x]`) vs. unshipped (`[ ]`).
- The `# NEW OP: {newTitle}` block: new OP title, new OP's CoO, carved WOs (verbatim), carved task checklist (renumbered 1..N, same checkbox semantics).

Build four sets and one duplicate report:

- **Parent WO labels** — bold labels of every bullet in the parent's `OPERATION.md ## MISSION ### Warning Orders`.
- **CHOP WO labels** — bold labels in CHOP CURRENT OP `### Warning Orders` ∪ CHOP NEW OP `### Warning Orders`.
- **Parent task titles** — the `{title}` portion of every `### TASK n — {title}` heading in the parent's `## EXECUTION`.
- **CHOP task titles** — the text after `TASK n — ` on every checkbox item in CHOP CURRENT OP `## EXECUTION` ∪ CHOP NEW OP `## EXECUTION`. Checkbox state is informational and is **not** part of the symbol.
- **Duplicate titles** — any `{title}` that appears more than once across the parent's EXECUTION sections, or more than once across the combined CHOP EXECUTION checklists.

Validate, in this order. Any failure aborts before any modification — do not call `mcp__naholo__create_operation`, do not edit the parent's `OPERATION.md`, do not delete `CHOP.md`, do not call `add-timeline`:

1. **WO parity** — Parent WO labels set must equal CHOP WO labels set.
2. **Task parity** — Parent task titles set must equal CHOP task titles set.
3. **No duplicate task titles** — duplicates on either side make the apply-time parent→CHOP mapping ambiguous. Do not attempt source-order resolution; refuse.

On any failure, collect every mismatch + duplicate report and print the abort report below as raw markdown (no surrounding fence) and stop. **Omit any sub-list whose items are empty**, and omit a parent section heading entirely when both of its sub-lists are empty:

> **CHOP is out of sync with OP #{parentNumber}.** Cannot apply.
>
> Warning Orders mismatch:
>
> - In CHOP but not on parent:
>   - `{bold-label}`
>   - `{bold-label}`
> - On parent but not in CHOP:
>   - `{bold-label}`
>   - `{bold-label}`
>
> EXECUTION tasks mismatch:
>
> - In CHOP but not on parent:
>   - `TASK n — {title}`
>   - `TASK n — {title}`
> - On parent but not in CHOP:
>   - `TASK m — {title}`
>   - `TASK m — {title}`
> - Duplicate titles on parent (apply mapping ambiguous):
>   - `{title}` ({N} occurrences)
> - Duplicate titles in CHOP (apply mapping ambiguous):
>   - `{title}` ({M} occurrences)
>
> Run `/chop "freeform — bring CHOP back into sync with the parent's current MISSION/EXECUTION"` to refresh the proposal, then re-run `/chopchop`. (Alternatively, hand-edit [CHOP.md]({operationDir}/notes/CHOP.md) to match the parent.)

Common causes: `/warno` ran between `/chop` and `/chopchop` and added or dropped a WO; `/opord` cut new tasks or retitled existing ones; the user hand-edited `CHOP.md` and introduced a typo in a WO label or task title.

When validation passes, the parent↔CHOP mapping is unambiguous: every CHOP task title resolves to exactly one `### TASK m — {title}` section on the parent (by literal title match), and every WO bold label resolves to exactly one parent WO bullet. Downstream steps rely on that guarantee.

`/chopchop` does **not** police shipped tasks. If a `- [x] TASK n — ...` appears under CHOP `# NEW OP`, trust the doc and carry the task — including its `#### After-Action Report` if present — to the new OP. The shipped/unshipped policy decision happened during `/chop` via `AskUserQuestion`; re-asking here would just be friction. The CHOP checkbox state is informational only; the source of truth for "is this shipped" is the parent's `TASKS.md` checkbox state (read in step 5).

### 7. Allocate Target Reference Points

Read the parent's `### Target Reference Points`. For each TRP entry, decide based on the carved vs. surviving WOs:

- **Supports only carved WOs** → move to new OP, drop from parent.
- **Supports only surviving WOs** → keep on parent, omit from new OP.
- **Supports both** → keep on parent **and** copy to new OP (duplicates are fine — TRP is a curated map, not a single-source-of-truth index).

This is a judgment call per entry; the user does not review it. Lean toward duplication when in doubt — a TRP entry that's slightly out of scope on one side is cheap; a missing one is expensive.

### 8. Create the new OP server-side

Call `mcp__naholo__create_operation` with `title: {newTitle}` from `CHOP.md`. Capture the returned operation `number` — call this `{newNumber}` — and the returned `url` — call this `{newUrl}`.

### 9. Compose and push the new OP's `OPERATION.md`

Build the seed content (single markdown block):

```markdown
# OP #{newNumber}: {newTitle}

## SITUATION

### Pain

{One or two sentences narrowing the parent's SITUATION.Pain to just the carved scope, in the parent's own words where possible. Reuse the parent's wording if it already reads narrowly.}

### Notes

- Carved from OP #{parentNumber} ({parentTitle}) on {YYYY-MM-DD}. See parent's TIMELINE for the chop event.

## MISSION

### Concept of Operations

{CHOP.md's NEW OP `### Concept of Operations` body, verbatim.}

### Warning Orders

{For each WO listed in `CHOP.md`'s NEW OP `### Warning Orders`, locate the matching bullet in the parent's `OPERATION.md ## MISSION ### Warning Orders` by bold-label match and copy that bullet **with all its sub-bullets** (including `- ?` open alts and `- Rejected:` lines). The CHOP brief drops those sub-bullets for readability; the new OP needs them back since OPERATION.md is the source of truth.}

### Target Reference Points

{Allocated TRP entries from step 7, formatted per the manual's TRP rules: backtick-wrapped paths, folder paths end with `/`, noun-only tags, no sub-bullets.}

## EXECUTION

### TASK 1 — {title from CHOP NEW OP TASK 1}

#### Intent

{Verbatim copy of the parent's `### TASK {originalN} — …` → `#### Intent` body.}

#### Scheme of Maneuver

{Verbatim copy when present on the parent's task section; omit the heading entirely if absent.}

#### Course of Action

{Verbatim copy of the parent's `### TASK {originalN} — …` → `#### Course of Action` body.}

### TASK 2 — {title from CHOP NEW OP TASK 2}

…
```

Notes on the EXECUTION carry-over:

- **Verbatim copy of every sub-section the parent task has** — Intent, Scheme of Maneuver (when present), Course of Action, and `#### After-Action Report` (when present on a shipped task that `/chop` confirmed for the carve). Do not rewrite, do not re-summarize.
- **Renumber starting at 1** per `CHOP.md`'s NEW OP order. The parent-task mapping is by literal title match (validated in step 6 to be unambiguous).

Push the composed content via `mcp__naholo__create_note` with `operationNumber: {newNumber}`, `name: 'OPERATION'`, `content: {composed markdown}`.

### 10. Create the new OP's tasks server-side

For each carved task in `CHOP.md`'s NEW OP order, call `mcp__naholo__create_task` with:

- `operationNumber: {newNumber}`
- `name: {task title}` (the text after `TASK n — ` on the CHOP checkbox item — the verbatim parent task title; the em-dash and its surrounding spaces are the separator)
- `position: {1-based index}`

Do not pass `note` — the per-task Intent / Scheme of Maneuver / Course of Action lives in `OPERATION.md ## EXECUTION` and is the source of truth. Do not pass `parentTaskId` — the flat-list rule from the manual still applies.

For each carved task that the CHOP entry marked `- [x]` (shipped), immediately follow the `create_task` call with `mcp__naholo__update_task` using the returned task id and `done: true`, so the server-side checkbox state matches the AAR-present state on the new OP.

### 11. Prune the parent OP locally

Edit `{operationDir}/notes/OPERATION.md` in place:

- **Concept of Operations** — replace `### Concept of Operations`'s body with `CHOP.md`'s CURRENT OP CoO body. If they're identical, no-op the edit.
- **Warning Orders** — **delete** the carved WO bullets in place (identified by bold-label match against `CHOP.md`'s NEW OP WOs), along with their full sub-bullet tails. Surviving WOs stay untouched — keep their `- ?` and `- Rejected:` sub-bullets intact. Do **not** rewrite the whole block from `CHOP.md`'s CURRENT OP WOs; the CHOP brief drops sub-bullets for readability and using it as a wholesale replacement would wipe legitimate open alts and rejected-option records from the parent.
- **Target Reference Points** — replace `### Target Reference Points`'s body with the parent's allocated TRP entries from step 7.
- **EXECUTION** — delete the entire `### TASK n —` block (heading + Intent + Scheme of Maneuver + Course of Action + After-Action Report when present) for every task carved to the new OP. Surviving tasks keep their original numbers — **do not renumber**. Gaps are fine and match `/opord`'s never-re-slot rule.

Edit `{operationDir}/TASKS.md` in place to delete the matching `- [ ] n. Title` lines for each carved task number. **Do not renumber** surviving lines.

### 12. Delete `CHOP.md` (local and server)

The proposal has been applied. Delete `{operationDir}/notes/CHOP.md` from the local infiled dir, and remove the server-side `CHOP` note from the **parent OP** so a fresh `/infil` on another device doesn't resurrect it.

- **Local**: delete the file with the `Bash` `rm` (or `Write`-equivalent) tool.
- **Server**: call `mcp__naholo__delete_note` with `operationNumber: {parentNumber}`, `name: 'CHOP'`. If the note doesn't exist server-side (the proposal was never `/sitrep`-ed), the call is a no-op — swallow a 404 silently.

Order matters: **server delete first, then local delete**. If the server delete fails (network blip, transient error), the local file stays in place and the user can retry. If the order is reversed and the server delete fails after the local delete, the next `/sitrep` would re-push `CHOP.md` from the .base/ baseline reconciliation and leak the now-stale proposal back to the server.

### 13. Stamp TIMELINE

Run:

```
naholo agent add-timeline -T chopchop 'Applied CHOP: spawned OP #{newNumber} "{newTitle}"; moved WOs: {comma-joined bold labels}; moved tasks: {comma-joined parent task numbers, or "none"}; TRP — moved {M}, duplicated {D}, kept {K}.'
```

### 14. Print summary

Re-read the parent's post-prune `OPERATION.md` and `TASKS.md` and determine the next-action mode:

- **`mission-only`** — `## EXECUTION` is absent on the parent, or present but contains zero `### TASK n —` sections.
- **`execution-ready`** — `## EXECUTION` exists and `TASKS.md` has at least one `- [ ]` row.
- **`all-shipped`** — `## EXECUTION` exists and every `TASKS.md` row is `- [x]`. The parent is finished and ready to close out.

Print the summary as raw markdown — no surrounding fence. Use markdown link syntax.

**Heading + result block** (always printed):

> CHOP applied on [OP #{parentNumber}: {parentTitle}]({operationDir}/notes/OPERATION.md)
>
> - Spawned: OP #{newNumber} {newTitle} — [open on Naholo]({newUrl})
> - Moved to new OP: {N} Warning Orders, {M} task(s), {T_moved} TRP entries

**Then append the next-actions block** that matches the mode you just determined.

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

- `<mission-line>` — read the post-prune `OPERATION.md` and locate the `## MISSION` heading.
- `<execution-line>` — locate the `## EXECUTION` heading.
- `<task-line>` (only needed for `execution-ready`) — pick the first `- [ ] {N}. {title}` row from `TASKS.md` in source order. Substitute `{N}` and `{title}` in the `/splash` bullet from that row, then locate `### TASK {N} — {title}` in `OPERATION.md` and use that heading's line. By construction, `execution-ready` guarantees at least one unchecked row exists.

The new-OP URL comes directly from `mcp__naholo__create_operation`'s response — read `url` off the returned JSON; no need to compose from `baseUrl`/`projectSlug`.

## Post-chopchop phase

`/chopchop` **ends the chop phase**. No new phase begins automatically — the next phase is the user's choice, picked by invoking the appropriate skill. Do not infer a phase from `OPERATION.md` state and act as if it had been entered.

If the user asks for follow-up work on the parent without explicitly invoking a skill, **push back once**. Surface the skill that owns the work — picking the most plausible suggestion from the prompt, or from the post-prune `OPERATION.md` state determined in step 14 if the prompt is ambiguous — and wait for them to invoke it. Common mappings:

- Rewriting parent `## MISSION` → suggest `/warno "..."`
- Cutting tasks / editing parent `## EXECUTION` or `TASKS.md` → suggest `/opord "..."`
- Implementing a parent task → suggest `/splash {N}`
- Drafting another split → suggest `/chop "..."` (the chop phase has ended; `CHOP.md` is gone)
- Pushing the parent's pruned state → suggest `/sitrep` (checkpoint) or `/exfil` (final)
- Working on the spawned OP → suggest `/exfil` parent first, then `/infil {newNumber}` in a fresh session

If the user pushes back, rephrases the request, or otherwise signals they want the work done without invoking the suggested skill, **treat that as an explicit override and do the work directly**. The one-time push-back is a check, not a wall — the escape hatch stays open till the next skill invocation.

## Rules

- **`CHOP.md` is mandatory** — if it doesn't exist, stop and point the user at `/chop`. `/chopchop` cannot improvise a split from freeform args.
- **No freeform args** — the only customization channel between `/chop` and `/chopchop` is hand-editing `CHOP.md`.
- **Trust `CHOP.md` on shipped scope** — if it lists a shipped task under `# NEW OP`, carry the task with its AAR intact. The shipped-or-not decision is `/chop`'s gate, not `/chopchop`'s.
- **Verbatim transfer** — carved WOs and carved task sections (Intent / Scheme of Maneuver / Course of Action / After-Action Report when present) move to the new OP word-for-word. No paraphrase, no dropped sub-bullets, no re-summarized CoA.
- **TRP allocation is agent judgment, not user review** — duplicate when in doubt.
- **No renumbering on the parent** — surviving task numbers stay; gaps are fine.
- **New OP renumbers from 1** — both `OPERATION.md ### TASK` headings and `create_task` `position` values start at 1 and run in `CHOP.md`'s NEW OP order.
- **Delete `CHOP.md` last** — only after the server-side OP exists, `OPERATION.md` is seeded, tasks are created, and the parent prune is complete. If anything fails midway, leave `CHOP.md` in place so the user can retry.
- **Always use absolute filesystem paths in link targets** — substitute `{operationDir}` literally with the absolute path from `naholo agent op-path`.
- Print the summary as raw markdown — no surrounding fence.
