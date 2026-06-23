---
name: raid
description: Fresh-OP shortcut — write a stub WARNO (real CONOPS + TRP, Constraints `_N/A_`) and chain `/opord` to cut tasks. Use when architecture review is overkill.
argument-hint: '["freeform task-cutting hints"]'
---

# Raid — Fresh-OP Shortcut

The `/warno` + `/opord` collapse for small fresh OPs where architecture review would be overkill. `/raid` writes `## WARNING ORDER` inline (real Concept of Operations and Target Reference Points, `### Constraints` body marked `_N/A_`), then invokes `/opord` via the `Skill` tool to cut tasks and mirror `TASKS.md`. Once the chained `/opord` returns, the session is in the post-opord phase and the rest of the cycle (`/splash → … → /exfil`) runs unchanged.

`/raid` is for **fresh OPs only**: it aborts when `## WARNING ORDER` or `## OPERATION ORDER` already exists in `OPERATION.md`. Once an OP has any plan content, WARNO rewrites belong to `/warno` and plan revisions belong to `/opord`.

## Arguments

Anything passed as an argument is treated as **freeform task-cutting hints**. Optional — like `/warno`, `/raid` reads the OP's title, `LOGS.yml`, and `notes/` for input and only pushes back when the OP has no meaningful prompt to follow. When args are present, `/raid` forwards them verbatim to the chained `/opord` invocation as freeform context.

Common patterns:

- `/raid` (no args) — fresh OP with a clear-enough title + logs to cut tasks from.
- `/raid two tasks: schema first, route handler second` — explicit task-cutting hint forwarded to `/opord`.

## What to do

### 1. Boot

**If you haven't run `naholo agent boot` in this session**, run it now via the Bash tool. Adopt `<personality>` as your voice when the block is present, adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}` — every file path in this skill composes on top of it.

**If boot already ran this session**, run `naholo agent op` instead — treat its `<op_status>` payload as the current op status.

If `<op_status>` carries `No infilled operation.`, tell the user to run `/infil <opNum>` first and abort.

`<op_status>` carries `currentOp` / `opTitle` / `opNotes` — read from it whenever this skill needs them.

### 2. Load context

Read these now:

- `{operationDir}/notes/OPERATION.md` — the live OP document; re-read every invocation so manual mid-session edits land
- `{operationDir}/TASKS.md` — the checklist
- `{operationDir}/LOGS.yml` and any free-form `{operationDir}/notes/*.md` the OP carries — the task-cutting input `/raid` reads when args are empty
- `{operationDir}/notes/TIMELINE.md` — **first session-boot only**; never re-read after that (it's a fresh-session catch-up doc, not in-session state)

### 3. Fresh-OP guard

`/raid` requires a clean plan canvas. If `OPERATION.md` already contains a `## WARNING ORDER` heading or a `## OPERATION ORDER` heading, abort. Print as raw markdown (no surrounding fence) and stop:

> `/raid` is for fresh OPs only — `OPERATION.md` already has WARNING ORDER or OPERATION ORDER content. Use `/warno` for WARNO revisions or `/opord` for plan revisions instead.

Also confirm input viability: if neither the OP title, `LOGS.yml`, free-form notes, nor the freeform args carry enough signal to cut tasks from, stop and ask the user for a freeform prompt rather than guess.

### 4. Research the codebase

Investigate enough of the codebase to write a real Concept of Operations and a real Target Reference Points map. `/raid` skips Constraint derivation but the other two WARNO subsections still pay their normal cost — a stub CONOPS leaves the downstream `/splash` and any future `/warno` revisions flying blind.

As you research, keep a curated shortlist of files, folders, and glob patterns a fresh downstream session would actually need. Filter aggressively: skip files opened only to disprove a hypothesis, skip siblings covered by a folder or glob, prefer a folder/glob over enumerating files. TRP is a scannable map, not a research log.

### 5. Write `## WARNING ORDER` to `OPERATION.md`

Append `## WARNING ORDER` after the last `## SITUATION` content with all three subsections in fixed order:

- `### Concept of Operations` — **two or three sentences max**. Names the chosen approach and connects it to `SITUATION.Pain`. Concept-level only — no file lists, no edit steps.
- `### Constraints` — body is exactly the single line `_N/A_` (no bullets, no decisions). The `_N/A_` marker is the recoverable signal that the operator chose to skip architecture review; `/warno` can upgrade the stub into a real Constraints list later if the operator changes their mind.
- `### Target Reference Points` — a curated flat bullet list of files / folders / glob patterns the chained `/opord` (and downstream `/splash` sessions) need. Each entry is `` `{path-or-glob}` — {tag} ``: backtick-wrapped path (folders end with `/`, globs use standard wildcards), then a noun-only tag of a few words (no verbs, no clauses). No sub-bullets.

### 6. Add the TIMELINE bullet

Run `naholo agent add-timeline -T raid 'Drafted stub WARNO.'`. The `raid` label is the durable signal for "the WARNO's Constraints were skipped" — downstream sessions read it to know the plan came from a raid, not a full warno.

### 7. Chain `/opord` via the `Skill` tool

Invoke the `opord` skill via the `Skill` tool. Forward any freeform args verbatim as `args`; pass an empty `args` string when `/raid` was invoked bare. `/opord` reads the just-written WARNO (CONOPS + TRP carry real content; the `_N/A_` Constraints body satisfies its "WARNING ORDER populated" check), cuts tasks, writes `## OPERATION ORDER`, mirrors `TASKS.md`, and appends its own TIMELINE bullet.

`/raid` ends with whatever summary `/opord` prints — do not print a separate summary, do not duplicate the OPERATION ORDER link.

## Post-raid phase

There is no post-raid phase. The chained `/opord` declares the **opord** phase on return, and the session inherits it. All post-opord-phase rules (in-phase plan touch-ups, wrong-phase routing for WARNO rewrites and task implementations, CHOP-gate behavior) apply verbatim.

## Rules

- **Fresh-OP-only**: `/raid` writes WARNING ORDER + OPERATION ORDER from a clean canvas. Abort when `## WARNING ORDER` or `## OPERATION ORDER` already exists.
- **Real CONOPS + TRP, stub Constraints**: the `_N/A_` body lives only inside `### Constraints`. Concept of Operations and Target Reference Points are written normally.
- **Args forwarded to the chained `/opord`**: pass freeform args through verbatim; pass empty when invoked bare.
- **No OPERATION ORDER-writing code in `/raid`**: the chained `/opord` owns task cutting and `TASKS.md` mirroring. Never write `## OPERATION ORDER` directly from `/raid`.
- **No post-raid summary**: end with `/opord`'s summary. Two TIMELINE bullets (`raid` then `opord`) is the expected shape.
- **Do NOT implement any code** — only edit `OPERATION.md`; TIMELINE.md is updated via `naholo agent add-timeline`; OPERATION ORDER + TASKS.md are owned by the chained `/opord`.
- **Always use absolute filesystem paths in link targets** — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with `opPath` from boot's `<op_status>`.
