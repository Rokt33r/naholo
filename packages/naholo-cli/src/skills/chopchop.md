---
name: chopchop
description: Apply the CHOP proposal — runs a pre-flight validation against the parent, allocates TRP into `CHOP.md` per side, then shells out to `naholo agent chopchop` which spawns the new OP, prunes the parent, posts a seed log, pushes, and cleans up. Run after `/chop` produces `notes/CHOP.md` and the user has reviewed it.
argument-hint: ''
---

# Chopchop — Apply the CHOP

The second half of the OP-splitting workflow. `/chopchop` validates `notes/CHOP.md` against the parent's current `OPERATION.md`, allocates TRP into `CHOP.md` per side, and shells out to `naholo agent chopchop` — the CLI does every server call, file edit, push, and cleanup in one transactional pass. After `/chopchop`, the parent stays infilled in whatever phase it was already in; the new OP exists server-side only until someone runs `/exfil` on the parent and `/infil <newNumber>` in a fresh session.

This skill takes no freeform args — everything it needs is in `CHOP.md`. The user's editing pass on `CHOP.md` between `/chop` and `/chopchop` is the only customization channel.

## Arguments

None. `/chopchop` always consumes `{operationDir}/notes/CHOP.md` as-is. If the user wants to change the split, they edit `CHOP.md` before running `/chopchop`.

## What to do

### 1. Boot

**If you haven't run `naholo agent boot` in this session**, run it now via the Bash tool. Adopt `<personality>` as your voice when the block is present, adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}` — the parent operation directory.

**If boot already ran this session**, run `naholo agent op` instead — treat its `<op_status>` payload as the current op status.

If `<op_status>` carries `No infilled operation.`, tell the user to run `/infil <opNum>` first and abort.

`<op_status>` carries `currentOp` / `opTitle` / `opNotes` — read from it whenever this skill needs them (`currentOp` / `opTitle` give the parent OP's `{parentNumber}` / `{parentTitle}`).

### 2. Load context

Read these now:

- `{operationDir}/notes/CHOP.md` — required. If missing, stop and tell the user to run `/chop …` first.
- `{operationDir}/notes/OPERATION.md` — re-read every invocation so manual mid-session edits land; needed for parity checks against the parent's WARNING ORDER/OPERATION ORDER and for the TRP allocation in step 4
- `{operationDir}/TASKS.md` — needed for the shipped/unshipped state on parent tasks
- `{operationDir}/notes/TIMELINE.md` — **first session-boot only**; never re-read after that

### 3. Validate `CHOP.md` (abort-before-modify gate)

Before allocating TRP, before shelling out to the CLI, before any side effect: confirm `CHOP.md` is structurally sound and refers to real, unambiguous symbols on the parent. The CLI assumes these guarantees; failure here aborts cleanly without touching the server.

Build from `CHOP.md` (skip `## Intent` — it's a human-readable summary `/chop` writes for the user; `/chopchop` ignores it):

- The `# CURRENT OP #{n}: {title}` header (must parse), the `## SITUATION` / `### Pain` body, the `## WARNING ORDER` block (CONOPS + Constraint labels), and the `## OPERATION ORDER` checklist. Each task item is `- [ ] TASK n — {title}` or `- [x] TASK n — {title}` — checkbox state encodes shipped (`[x]`) vs. unshipped (`[ ]`).
- The `# NEW OP: {newTitle}` header (must parse), the `## SITUATION` / `### Pain` body, the `## WARNING ORDER` block (CONOPS + Constraint labels), and the `## OPERATION ORDER` checklist (renumbered 1..N, same checkbox semantics).

Then build four sets and one duplicate report:

- **Parent Constraint labels** — bold labels of every bullet in the parent's `OPERATION.md ## WARNING ORDER ### Constraints`.
- **CHOP Constraint labels** — bold labels in CHOP CURRENT OP `### Constraints` ∪ CHOP NEW OP `### Constraints`.
- **Parent task titles** — the `{title}` portion of every `### TASK n — {title}` heading in the parent's `## OPERATION ORDER`.
- **CHOP task titles** — the text after `TASK n — ` on every checkbox item in CHOP CURRENT OP `## OPERATION ORDER` ∪ CHOP NEW OP `## OPERATION ORDER`. Checkbox state is informational and is **not** part of the symbol.
- **Duplicate titles** — any `{title}` that appears more than once across the parent's OPERATION ORDER sections, or more than once across the combined CHOP OPERATION ORDER checklists.

Validate, in this order. Any failure aborts before any modification — do not allocate TRP, do not run the CLI, do not call `add-timeline`:

1. **CURRENT OP header parses** — must be `# CURRENT OP #{n}: {title}` and `{n}` must equal `{parentNumber}`.
2. **NEW OP header parses** — must be `# NEW OP: {title}`.
3. **SITUATION presence** — both `# CURRENT OP` and `# NEW OP` blocks must contain a `## SITUATION` heading with a non-empty `### Pain` body. `### Notes` is optional. Pain/Notes bodies are free-form prose — no symbol-parity check.
4. **Constraint parity** — Parent Constraint labels set must equal CHOP Constraint labels set.
5. **Task parity** — Parent task titles set must equal CHOP task titles set.
6. **No duplicate task titles** — duplicates on either side make the apply-time parent→CHOP mapping ambiguous. Do not attempt source-order resolution; refuse.

TRP presence in `CHOP.md` is **not** validated — the next step regenerates it from scratch.

On any failure, collect every mismatch + duplicate report and print the abort report below as raw markdown (no surrounding fence) and stop. **Omit any sub-list whose items are empty**, and omit a parent section heading entirely when both of its sub-lists are empty:

> **CHOP is out of sync with OP #{parentNumber}.** Cannot apply.
>
> Header / SITUATION mismatch:
>
> - {one-line description per missing or malformed header, or per missing SITUATION/Pain block}
>
> Constraints mismatch:
>
> - In CHOP but not on parent:
>   - `{bold-label}`
>   - `{bold-label}`
> - On parent but not in CHOP:
>   - `{bold-label}`
>   - `{bold-label}`
>
> OPERATION ORDER tasks mismatch:
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
> Run `/chop freeform — bring CHOP back into sync with the parent's current WARNING ORDER/OPERATION ORDER` to refresh the proposal, then re-run `/chopchop`. (Alternatively, hand-edit [CHOP.md]({operationDir}/notes/CHOP.md) to match the parent.)

Common causes: `/warno` ran between `/chop` and `/chopchop` and added or dropped a Constraint; `/opord` cut new tasks or retitled existing ones; the user hand-edited `CHOP.md` and introduced a typo in a Constraint label or task title.

When validation passes, the parent↔CHOP mapping is unambiguous: every CHOP task title resolves to exactly one `### TASK m — {title}` section on the parent (by literal title match), and every Constraint bold label resolves to exactly one parent Constraint bullet. The CLI relies on that guarantee.

### 4. Allocate Target Reference Points into `CHOP.md`

Read the parent's `### Target Reference Points`. For each TRP entry, decide based on the carved vs. surviving Constraints:

- **Supports only carved Constraints** → write to NEW OP only.
- **Supports only surviving Constraints** → write to CURRENT OP only.
- **Supports both** → write to both sides (duplicates are fine — TRP is a curated map, not a single-source-of-truth index).

This is a judgment call per entry; the user does not review the allocation. Lean toward duplication when in doubt — a TRP entry that's slightly out of scope on one side is cheap; a missing one is expensive.

Then **overwrite** the `### Target Reference Points` block under each side's `## WARNING ORDER` in `{operationDir}/notes/CHOP.md` with the allocated entries. Always rewrites — does **not** honor user hand-edits to existing TRP blocks. The user's TRP review channel is editing the parent's WARNING ORDER TRP before `/chopchop`, not editing TRP inside `CHOP.md`.

Format per entry follows the manual's TRP rules: backtick-wrapped paths, folder paths end with `/`, noun-only tags, no sub-bullets. Omit the `### Target Reference Points` heading entirely on a side when the side has zero entries (mirrors the `OPERATION.md` omit-when-empty convention).

### 5. Run `naholo agent chopchop`

Shell out via Bash:

```
naholo agent chopchop
```

The CLI consumes `CHOP.md` as the source of truth and performs the entire apply pass: creates the new OP server-side, seeds its `OPERATION.md` + tasks (verbatim from CHOP + parent OPERATION ORDER sections), posts the seed log, patches the parent's `## SITUATION` / `## WARNING ORDER` / `## OPERATION ORDER` in place, renames the parent server-side when the title differs, runs `pushOp` on the parent, deletes `CHOP.md` (server then local), and stamps a `chopchop` TIMELINE bullet. Exit code 0 on success; non-zero with a CliError message on stderr otherwise.

On non-zero exit, surface the CLI's stderr to the user verbatim and stop. The CLI leaves `CHOP.md` in place on failure so the user can retry.

On success, parse stdout as the result block — one `key: value` per line:

```
parentNumber: <int>
parentTitle: <string>
newNumber: <int>
newTitle: <string>
newUrl: <url>
movedConstraints: <int>
movedTasks: <int>
missionLine: <int or n/a>
parentOpState: mission-only | execution-ready | all-shipped
executionLine: <int or n/a>
nextTaskLine: <int or n/a>
nextTaskNumber: <int or n/a>
nextTaskTitle: <string or n/a>
```

The CLI computes the line anchors and the `parentOpState` itself — the skill does not re-read `OPERATION.md` / `TASKS.md` afterward.

### 6. Print summary

Use markdown link syntax. The blocks below are output templates — print them raw, per the manual's `## Chat output` rule.

**Heading + result block** (always printed):

```md
CHOP applied on [OP #{parentNumber}: {parentTitle}]({operationDir}/notes/OPERATION.md)

- Spawned: OP #{newNumber} {newTitle} — [open on Naholo]({newUrl})
- Moved to new OP: {movedConstraints} Constraints, {movedTasks} task(s)
```

**Then append the next-actions block** that matches the `parentOpState` field from the CLI's result block.

`mission-only`:

```md
Next:

- `/warno …` — adjust [WARNING ORDER]({operationDir}/notes/OPERATION.md#L{missionLine}) on the parent.
- `/opord` — cut the parent [WARNING ORDER]({operationDir}/notes/OPERATION.md#L{missionLine}) into OPERATION ORDER tasks.
```

`execution-ready`:

```md
Next:

- `/opord …` — revise the parent's [OPERATION ORDER]({operationDir}/notes/OPERATION.md#L{executionLine}) (insert / drop / rewrite unfinished tasks).
- `/splash` — ship [TASK {nextTaskNumber} — {nextTaskTitle}]({operationDir}/notes/OPERATION.md#L{nextTaskLine})
```

`all-shipped`:

```md
Next:

- `/exfil` — every task on the parent is shipped; sync and close out the operation.
```

For `all-shipped`, do not append `/warno`, `/opord`, `/splash`, `/sitrep`, or any other skill — just the single `/exfil` bullet. For `mission-only` and `execution-ready`, the listed bullets are the only next-step pointers; do not invent additional options.

Substitute `{missionLine}`, `{executionLine}`, `{nextTaskLine}`, `{nextTaskNumber}`, `{nextTaskTitle}` directly from the CLI result block. When a field's value is `n/a`, the next-actions variant that would have used it does not apply (the `parentOpState` field already selected the correct variant).

## Post-chopchop phase

`/chopchop` **ends the chop phase**. No new phase begins automatically — the next phase is the user's choice, picked by invoking the appropriate skill. Do not infer a phase from `OPERATION.md` state and act as if it had been entered.

If the user asks for follow-up work on the parent without explicitly invoking a skill, **push back once**. Surface the skill that owns the work — picking the most plausible suggestion from the prompt, or from the `parentOpState` value the CLI returned in step 5 if the prompt is ambiguous — and wait for them to invoke it. Common mappings:

- Rewriting parent `## WARNING ORDER` → suggest `/warno …`
- Cutting tasks / editing parent `## OPERATION ORDER` or `TASKS.md` → suggest `/opord …`
- Implementing a parent task → suggest `/splash {N}`
- Drafting another split → suggest `/chop …` (the chop phase has ended; `CHOP.md` is gone)
- Pushing the parent's pruned state → suggest `/sitrep` (checkpoint) or `/exfil` (final)
- Working on the spawned OP → suggest `/exfil` parent first, then `/infil {newNumber}` in a fresh session

If the user pushes back, rephrases the request, or otherwise signals they want the work done without invoking the suggested skill, **treat that as an explicit override and do the work directly**. The one-time push-back is a check, not a wall — the escape hatch stays open till the next skill invocation.

## Rules

- **`CHOP.md` is mandatory** — if it doesn't exist, stop and point the user at `/chop`. `/chopchop` cannot improvise a split from freeform args.
- **No freeform args** — the only customization channel between `/chop` and `/chopchop` is hand-editing `CHOP.md`.
- **TRP allocation is regenerated on every `/chopchop` run** — user hand-edits to TRP blocks in `CHOP.md` are not preserved. The user's TRP review channel is editing the parent's WARNING ORDER TRP before `/chopchop`.
- **Trust `CHOP.md` on shipped scope** — if it lists a shipped task under `# NEW OP`, the CLI carries the task with its AAR intact. The shipped-or-not decision is `/chop`'s gate, not `/chopchop`'s.
- **CLI owns apply semantics** — verbatim Constraint / task-section transfer, no-renumbering on the parent, new-OP renumber-from-1, server-then-local CHOP delete, and the parent rename are all CLI responsibilities. The skill validates and shells out; it does not edit `OPERATION.md`, `TASKS.md`, or call MCP tools.
- **Always use absolute filesystem paths in link targets** — substitute `{operationDir}` literally with `opPath` from boot's `<op_status>`.
- Print the summary as raw markdown — no surrounding fence.
