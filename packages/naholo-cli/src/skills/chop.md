---
name: chop
description: Draft a CHOP proposal for splitting the currently infiled Naholo operation. Writes `notes/CHOP.md` showing how MISSION.Warning Orders and EXECUTION tasks split between the current OP and a proposed new OP, for user review. No server calls, no pruning — `/chopchop` applies the proposal once the user is satisfied.
argument-hint: '"freeform — what to carve off"'
---

# Chop — Draft the CHOP proposal

The first half of the OP-splitting workflow. `/chop` reads the parent's current MISSION + EXECUTION, takes a freeform description of what to carve, and writes a `CHOP.md` proposal note showing **side-by-side** how Warning Orders and tasks split between the current OP and a proposed new OP. The user reviews (and optionally edits) `CHOP.md`, then runs `/chopchop` to apply it.

CHOP — short for **Change of Operational Control** — is the military verb for transferring a unit from one commander to another. Here the "unit" is a slice of MISSION + EXECUTION: a set of Warning Orders and the unfinished tasks that depend on them. `/chop` is the planning brief; `/chopchop` is the actual transfer.

The parent OP's `OPERATION.md` is **not touched** by this skill. Nothing goes to the server. The only side effect is creating `CHOP.md` in the parent's notes directory.

## Arguments

Required freeform args describing what to carve. There is no `/chop` without args — the skill needs a direction to cut along.

Common patterns:

- `/chop "subagent transcript ingest WOs"` — carve by topic; the model picks the matching WOs.
- `/chop "WOs 3, 4, 5 and the unfinished tasks that depend on them"` — carve by explicit reference.
- `/chop "everything related to the CLI upload path; new OP titled 'Subagent transcript ingest'"` — caller pre-suggests the new OP title.

Args that would put a **shipped task** (one with a populated `#### After-Action Report` in parent EXECUTION) onto the new OP are unusual but allowed — the skill confirms intent via `AskUserQuestion` before drafting the proposal. If the user confirms, the shipped task transfers with its AAR intact when `/chopchop` runs.

## What to do

### 0. Require freeform args

If the user invoked `/chop` with no args, abort immediately. Do not run `naholo agent boot`, do not read any files, do not call `add-timeline`. Print the message below as raw markdown (no surrounding fence) and stop:

> `/chop` requires a prompt describing what to carve. Re-run as `/chop "what to carve"` — e.g. `/chop "subagent transcript ingest WOs"`.

Args are mandatory whether or not `CHOP.md` already exists — both fresh draft and revision modes need instructions.

### 1. Boot

**If you haven't run `naholo agent boot` in this session**, run it now via the Bash tool. Adopt `<personality>` as your voice (skip if empty), adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}` — the parent operation directory.

**If boot already ran this session**, run `naholo agent op` instead — treat its `<op_status>` payload as the current op status.

If `<op_status>` carries `No infiled operation.`, tell the user to run `/infil <opNum>` first and abort.

`<op_status>` carries `currentOp` / `opTitle` / `opNotes` — read from it whenever this skill needs them (`currentOp` / `opTitle` give the parent OP's `{parentNumber}` / `{parentTitle}`).

### 2. Load context

Read these now:

- `{operationDir}/notes/OPERATION.md` — the live OP document; re-read every invocation so manual mid-session edits land; the parent's `## SITUATION` is source material for the two proposed SITUATIONs drafted in step 3, and the rest is needed to identify carveable WOs / tasks and each task's shipped state
- `{operationDir}/TASKS.md` — task numbers + titles
- `{operationDir}/notes/CHOP.md` — **only when present** (a revision run); the args describe how to tweak the existing proposal, not draft a fresh one
- `{operationDir}/notes/TIMELINE.md` — **first session-boot only**; never re-read after that

If `## MISSION` is absent in `OPERATION.md`, stop and tell the user there's nothing to chop yet — run `/warno` first.

### 3. Plan the split

Branch on whether `CHOP.md` already existed in step 2:

**Fresh draft (no prior `CHOP.md`)** — derive the full split from the args + the parent's current `OPERATION.md`. Decide every field below from scratch:

- **Carved Warning Orders** — the exact WO bullets (by bold label) that match the args. If args are ambiguous, pick the smallest literal-reading set and surface the ambiguity in `## Intent`.
- **Surviving Warning Orders** — every WO that's not carved.
- **Carved tasks** — every `### TASK N — Title` whose Intent / Course of Action only makes sense under the carved WOs. If any candidate carved task is **shipped** (its parent section has `#### After-Action Report`), pause and ask the user via `AskUserQuestion` whether it's intentional to move shipped work to the new OP. Show the task number + title + a one-line AAR summary so they can decide per task. Default option: keep shipped tasks on the parent. Only include a shipped task under `# NEW OP` if the user explicitly confirms.
- **Surviving tasks** — every other `### TASK N`, including all shipped ones.
- **Proposed parent title** — reuse the parent's existing title verbatim unless the carve invalidates it (e.g. the title names a scope that's entirely moving to the new OP). When it does, draft a narrower title in the same shape as the original. The user retitles by editing the `# CURRENT OP #{n}: {title}` header directly on review.
- **Proposed new-OP title** — short noun phrase, follows the parent's title conventions. Use the user's suggestion if their args included one; otherwise propose one based on the carved WOs.
- **Parent SITUATION (post-split)** — narrow the parent's existing `### Pain` body to the surviving scope, in the parent's own words where they still read true. Drop `### Notes` bullets that only applied to carved WOs; keep ones that still apply. Omit the `### Notes` heading entirely when nothing survives (same convention as `OPERATION.md`).
- **New OP SITUATION** — derive `### Pain` from the carved scope, in the parent's own words where they read true at the narrower scope. `### Notes` is optional — populate it only when there's a concrete pointer worth surfacing (one-line bullet, omit the heading entirely otherwise).
- **Post-split Concept of Operations for the parent** — if the parent's existing CoO would read wrong after the carve (e.g. mentions the carved approach), draft a narrower version: **two or three sentences max**, concept-level only, no file lists / edit steps / build commands. If the existing CoO still reads true post-carve, reuse it verbatim.
- **Concept of Operations for the new OP** — **two or three sentences max**, scoped to the carved approach. Concept-level only: name the chosen path and connect it back to the carved Pain. Do **not** enumerate files, edit steps, or build commands here — those belong in Warning Orders or land later in EXECUTION on the new OP. May be a verbatim slice of the parent's CoO if it already reads narrowly.

**Revision (`CHOP.md` already existed)** — start from the existing proposal and edit only the fields the args explicitly target. Do **not** re-derive every field from the parent — that would clobber the user's review pass. The default for every field is "leave it alone." Apply the args as targeted edits — move a WO between sides, retitle the new OP, rewrite a Concept of Operations, swap two tasks, edit a SITUATION body — using the fresh-draft field definitions above as the spec for what each field means.

Then run a single re-validation pass against the parent's current `OPERATION.md` (which may have changed between sessions): if a WO bold label or task title referenced in the old `CHOP.md` no longer exists on the parent (a `/warno` or `/opord` ran between chops), drop the stale reference and call it out in the summary. Re-validation is the only thing that touches fields the args didn't name.

**Do not** allocate Target Reference Points in `CHOP.md`. TRP allocation is `/chopchop`'s job — agents at apply time decide which TRP entries support only carved WOs (move), only surviving WOs (keep), or both (duplicate). The user is not expected to review TRP at proposal time.

### 4. Write `CHOP.md`

Compose `{operationDir}/notes/CHOP.md` exactly to this format. Use `Write` (it overwrites the existing file on revision runs):

```markdown
# CHOP

## Intent

{One to three sentences at most. Concept-level only — names the cleave line and why. No file lists, no edit steps, no TRP, no enumerated WO references. Surface any ambiguity from step 3 here in plain language.}

---

# CURRENT OP #{parentNumber}: {proposed parent title}

## SITUATION

### Pain

{Parent's post-split Pain body — narrowed from the parent's existing `### Pain`, parent's words where they still read true.}

### Notes

- {Surviving notes that still apply post-split. Omit the `### Notes` heading entirely when nothing survives.}

## MISSION

### Concept of Operations

{Post-split CoO for the parent — either the verbatim existing CoO or the narrowed draft from step 3.}

### Warning Orders

{The surviving WOs, verbatim — preserve bold labels and reasoning halves. **Drop** any `- ?` open-alt and `- Rejected:` sub-bullets; they don't belong in a CHOP planning brief.}

## EXECUTION

- [ ] TASK {n} — {title}
- [x] TASK {n} — {title}
- …

---

# NEW OP: {proposed title}

## SITUATION

### Pain

{Carved Pain — narrowed to the carved scope, parent's words where they read true at the narrower scope.}

### Notes

- {Optional. Omit the `### Notes` heading entirely when empty.}

## MISSION

### Concept of Operations

{New OP's CoO — two or three sentences scoped to the carved approach.}

### Warning Orders

{The carved WOs, verbatim — preserve bold labels and reasoning halves. **Drop** any `- ?` open-alt and `- Rejected:` sub-bullets; they don't belong in a CHOP planning brief.}

## EXECUTION

- [ ] TASK 1 — {title}
- [ ] TASK 2 — {title}
- …
```

Format rules to honor when writing the doc:

- **`/chop` does not write TRP.** `### Target Reference Points` blocks under each side's `## MISSION` are populated by `/chopchop` as a pre-flight rewrite before the CLI runs — they may be absent on a fresh `/chop` draft and are always regenerated on `/chopchop`.
- **Both sides carry `## SITUATION`.** `### Pain` is mandatory on both sides; `### Notes` is optional and follows the `OPERATION.md` omit-when-empty convention — omit the `### Notes` heading entirely when the side has nothing to flag, do not write a placeholder body.
- **The `# CURRENT OP #{n}: {title}` header carries the parent's proposed post-split title.** The user retitles the parent by editing this header. `# NEW OP: {title}` carries the new OP's proposed title the same way.
- **No `#### Intent`, no `#### Scheme of Maneuver`, no `#### Course of Action`, no `#### After-Action Report`** anywhere in `CHOP.md`. The EXECUTION blocks under each OP are **checkbox task items** (`- [ ] TASK n — title` or `- [x] TASK n — title`), not full task sections. Full per-task detail lives in `OPERATION.md`; `CHOP.md` is a planning brief.
- **Checkbox carries shipped state.** `- [x]` ≡ shipped (parent task section has `#### After-Action Report`). `- [ ]` ≡ unshipped. No textual annotations, no traceback parentheticals — the title is the link back to the parent's task.
- **Task lines mirror the parent's `### TASK` heading shape exactly** — same `TASK {n} — {title}` form (em-dash separator, single space on each side), title copied verbatim from the parent's `### TASK n — {title}` heading. Do not substitute a period for the em-dash, do not paraphrase the title, do not substitute Intent, do not summarize.
- **Parent task numbers do not change.** Under `# CURRENT OP`, list surviving tasks with their original numbers (gaps from carved tasks are fine — matches `/opord`'s never-re-slot rule).
- **New OP tasks renumber from 1.** Under `# NEW OP`, list carved tasks as `TASK 1`, `TASK 2`, … in the order they should appear on the new OP. The parent-task mapping is derived from title match at `/chopchop` time.
- **Shipped tasks under `# NEW OP` use `- [x]`** — same checkbox semantics as `# CURRENT OP`. They only appear there if the user explicitly confirmed in step 3.
- **WOs transfer verbatim except for `- ?` and `- Rejected:` sub-bullets, which are always dropped.** Bold labels and reasoning halves stay word-for-word; open alts and rejected-option lines do not appear in `CHOP.md`.
- **Three `---` separators** divide the doc into four blocks (intent → current OP → new OP). No other top-level `#` headings.

### 5. Stamp TIMELINE

Run, picking the verb based on step 3's branch:

```
naholo agent add-timeline -T chop 'Drafted CHOP.md: carved {N} WO(s), {M} task(s); proposed new OP "{proposed title}".'
```

or, on a revision run:

```
naholo agent add-timeline -T chop 'Revised CHOP.md: {one-sentence summary of what changed — e.g. "moved WO X to the new OP", "retitled new OP", "rewrote new OP CoO"}.'
```

### 6. Print summary

Show the chop draft state. Use markdown link syntax. Print as raw markdown — no surrounding fence.

Example (printed directly, not fenced):

CHOP proposal drafted on OP #{parentNumber}: "{parentTitle}"

- Carved: {N} WO(s), {M} unshipped task(s)
- Surviving: {N} WO(s), {M} task(s) ({S} shipped, immutable)
- Proposed new OP: "{proposed title}"
- Review: [CHOP.md]({operationDir}/notes/CHOP.md)

Next:

- Looks good → `/chopchop` to apply (spawns the new OP server-side and prunes the parent).
- Want to tweak the split → edit `CHOP.md` directly (move bullets between the CURRENT and NEW OP sections, rename the new OP, rewrite either Concept of Operations), then `/chopchop`.
- Abandon the proposal → delete `CHOP.md` and the chop never happened.

## Post-chop phase

Running `/chop` enters the **chop** phase. The phase persists until `/chopchop` consumes `CHOP.md`, the user deletes `CHOP.md`, `/exfil` cleans up the workflow, or the session ends. `/sitrep` is sync-only and does not end the phase.

While in the chop phase (i.e. `CHOP.md` exists):

- **In-phase follow-up edits** — two equally valid channels for revising the proposal: hand-edit `CHOP.md` directly, or re-run `/chop "freeform"` to apply a revision through the skill. Re-runs round-trip across sessions.
- **Other skills are not blocked** — `/warno`, `/opord`, and `/splash` may still run while `CHOP.md` exists. They each surface their own "CHOP pending" `AskUserQuestion` gate so the user can either cancel out and revise CHOP first, or proceed knowing the proposal will desync. If the user proceeds, they own re-running `/chop "freeform"` afterward to bring `CHOP.md` back into sync with the parent's updated MISSION / EXECUTION.
- **Apply the proposal** → `/chopchop` (consumes `CHOP.md`, ends the chop phase).
- **Discard the proposal** → `/nochop` (deletes `CHOP.md`, stamps TIMELINE, ends the chop phase, points at the next action).
- **Push the parent's current state to the server without leaving** → `/sitrep` (does not end the phase). `CHOP.md` syncs along with the other notes, so a teammate or a future fresh session can `/infil` and resume the proposal.

## Rules

- **Args are mandatory** — `/chop` with no args is an error.
- **Shipped tasks require explicit confirmation to carve** — if a candidate carved task is shipped, pause via `AskUserQuestion` per step 3. Default to keeping the shipped task on the parent unless the user confirms the move; the AAR transfers with the task when they do.
- **No server calls** — `/chop` writes `CHOP.md` and a TIMELINE bullet. Nothing else. No `mcp__naholo__create_operation`, no `create_note`, no parent `OPERATION.md` edits.
- **`/chop` does not write TRP** — `/chopchop` populates the `### Target Reference Points` block under each side's `## MISSION` as a pre-flight rewrite before its CLI runs.
- **No per-task detail in `CHOP.md`** — EXECUTION blocks are one-line task summaries only. No Intent, Scheme of Maneuver, Course of Action, or AAR.
- **SITUATION bodies and the CURRENT OP header title are user-editable surfaces** — `/chop` drafts them on a fresh run, but revision runs preserve hand-edits unless the args explicitly target them. The user reviews the proposed Pain / Notes / parent title in `CHOP.md` before `/chopchop` applies the split.
- **One proposal at a time** — only one `CHOP.md` exists at any moment. Re-running `/chop` while `CHOP.md` is present revises the existing proposal in place; it does not stack a second one.
- **Verbatim WO transfer in the draft** — carved and surviving WOs both appear word-for-word from the parent's `OPERATION.md`.
- **Always use absolute filesystem paths in link targets** — substitute `{operationDir}` literally with `opPath` from boot's `<op_status>`.
- Print the summary as raw markdown — no surrounding fence.
