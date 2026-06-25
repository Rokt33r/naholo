---
name: warno
description: Plan an infilled Naholo operation — research the codebase, fill WARNING ORDER (Concept of Operations, Constraints, Target Reference Points) in OPERATION.md. OPERATION ORDER is owned by `/opord`.
argument-hint: '["freeform WARNO instructions"]'
---

# Warno — Write the Warning Order

The WARNO-writing skill. Researches the codebase and writes `## WARNING ORDER` (Concept of Operations / Constraints / Target Reference Points) into `OPERATION.md` — appending the section when absent, revising in place when it already exists. Stops there. `/warno` does **not** write `## OPERATION ORDER` and does **not** mirror to `TASKS.md` — those are owned by `/opord`.

`OPERATION.md` is a container holding the orders successively issued for one op: `## SITUATION` is shared context, `## WARNING ORDER` is the WARNO document (preliminary direction), `## OPERATION ORDER` is the OPORD document (the full task-cut plan). `/warno` owns the WARNO. Re-running `/warno` is for direction changes (Concept of Operations rewrite, Constraint revision). Once the WARNO is settled, the user runs `/opord` to cut it into single-commit-sized tasks.

## Arguments

Anything passed as an argument is treated as **freeform instructions** describing how to revise the WARNO. There is no keyword list — read the instructions like any other prompt. First check them against `## Wrong-intent pushback`: if they ask for work another skill owns, push back and stop; otherwise classify the in-scope intent in step 5 (re-run dispatch). Common patterns:

- `/warno` (no args) — first run, or resume a partial WARNO draft.
- `/warno rework architecture decisions about plan mode` — targeted edit.
- `/warno rewrite the WARNO from scratch` — full restart.

## Wrong-intent pushback

`/warno` owns the WARNO and nothing else. Before acting on freeform args, classify their intent: if they ask for work `/warno` does not own, do **not** silently do it — name the owning skill, tell the user to run it, and stop. This routing is identical whether the wrong-intent prompt arrives as the args of a direct `/warno` call or as a follow-up request after the phase (see Post-warno phase):

- Cutting tasks / editing `## OPERATION ORDER` or `TASKS.md` → `/opord`
- Implementing a task → `/splash`
- Pushing to the server → `/sitrep` (checkpoint) or `/exfil` (final)

In-scope WARNO work — Concept of Operations rewrite, Constraint changes, Target Reference Points refresh — proceeds through the normal dispatch below.

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
- `{operationDir}/notes/TIMELINE.md` — **first session-boot only**; never re-read after that (it's a fresh-session catch-up doc, not in-session state)

### 3. Pending CHOP gate

If step 1's `opNotes` contains the entry `CHOP`, the session is in the chop phase — a CHOP proposal is in flight. Before doing any other work (no codebase research, no file edits, no `add-timeline`), surface this gate so the user can decide whether to desync the proposal or resolve it first.

Call `AskUserQuestion` with:

- **question**: `"A CHOP proposal is pending at notes/CHOP.md — running /warno now will desync it from the parent OP. How do you want to proceed?"`
- **header**: `"CHOP pending"`
- **options** (labels only, no descriptions):
  1. `"Resolve CHOP first (Recommended)"`
  2. `"Proceed anyway"`

Branch on the answer:

- **Resolve CHOP first** → abort the skill immediately. Do not load codebase context, do not edit any file, do not call `add-timeline`. Print as raw markdown (no surrounding fence) and stop:

  > `/warno` cancelled. Pick one:
  >
  > - `/chop …` — continue editing [CHOP]({operationDir}/notes/CHOP.md)
  > - `/chopchop` — apply CHOP
  > - `/nochop` — abort and abandon CHOP

- **Proceed anyway** → continue with the skill's normal flow. On the end-of-skill summary (step 7), append this line as the final line:

  > _After `OPERATION.md` is settled, run `/chop …` to make [CHOP]({operationDir}/notes/CHOP.md) reflect the new state._

### 4. Research the codebase

Investigate thoroughly to understand:

- Current architecture and patterns relevant to the operation
- Existing code that will be modified or extended
- Schema fields, type signatures, dependencies
- Conventions used in the project (from `CLAUDE.md` and existing code)

The goal is enough context to write a Concept of Operations that names the chosen path and connects to SITUATION.Pain, and Constraints that name each decision. `/opord` will use the WARNO to cut OPERATION ORDER later — warno's job is to make the preliminary brief crisp.

As you research, keep a curated shortlist of the files, folders, and glob patterns a fresh `/opord` session would actually need to read to cut OPERATION ORDER — these become `### Target Reference Points` (TRP) in step 6. Filter aggressively: skip files you only opened to disprove a hypothesis, files that are obvious from project conventions (e.g. `package.json`), and siblings already covered by a folder or glob entry. If a directory has more than a handful of relevant siblings, list the directory or a glob — never enumerate dozens of files. TRP is a scannable map, not a research log.

Default: commit to the most viable option you find — put it in the Constraint bold label and let the user override on review. Append a `- ? <prompt> (opt-a / opt-b) >` sub-bullet under a Constraint **only** in these two cases:

1. The user has named viable options in context (SITUATION, chat, prior `/warno` args) but has not picked one — surface their options back so they can pick.
2. You recognize a well-known alternative that is definitively better than the path you're about to commit to (industry-standard pattern, project's existing convention being violated) — surface the comparison instead of silently adopting the inferior path.

Otherwise do **not** ask. No alts for naming, paths, style, or anything you're already confident about. Most operations will have zero `- ?` sub-bullets. `/opord` later resolves any that remain.

### 5. Re-run dispatch + write WARNING ORDER

Inspect the current state of OPERATION.md WARNING ORDER and any freeform args. Branch:

- **WARNING ORDER absent (no `## WARNING ORDER` heading at all), no args** → fresh write. Append `## WARNING ORDER` itself plus all three subsections (Concept of Operations, Constraints, Target Reference Points) after the last `## SITUATION` content. Run `naholo agent add-timeline -T warno 'Drafted WARNO.'`.
- **WARNING ORDER present, no args** → stop. The skill cannot tell whether a present WARNO is finished or still in progress, and silently editing it risks clobbering committed direction. Tell the user to either re-run with freeform args describing the change (`/warno …`) or delete the `## WARNING ORDER` section from `OPERATION.md` and re-run `/warno` for a fresh write. Do not modify the WARNO, do not append a TIMELINE bullet.
- **Args provided** → first run them through `## Wrong-intent pushback`: if the intent belongs to another skill, name the owner and stop. Otherwise classify the in-scope intent:
  - **Targeted edit** — args describe partial changes to the WARNO (Concept of Operations, Constraints, Target Reference Points). Apply the described edits in place; refresh TRP if the edit changes which paths are relevant. Run `naholo agent add-timeline -T warno '{summary}'`.
  - **Full restart** — args explicitly say start over (e.g., "rewrite the WARNO from scratch"). Replace the WARNO wholesale (including TRP). If `## OPERATION ORDER` already has content, use `AskUserQuestion` to ask whether to **keep OPERATION ORDER** (let `/opord` reconcile it against the new WARNO later) or **flush OPERATION ORDER** (delete every task section — including shipped ones — and leave OPERATION ORDER empty for `/opord` to rewrite from scratch). Do not proceed until the user answers. TIMELINE.md is preserved either way. Run `naholo agent add-timeline -T warno '{summary, including kept/flushed OPERATION ORDER}'`.

### 6. Write OPERATION.md WARNING ORDER

`## WARNING ORDER` has three subsections in fixed order (add any that are missing):

- `### Concept of Operations` — **two or three sentences max**. Names the chosen approach and connects it to `SITUATION.Pain`. Concept-level only — do **not** enumerate files, edit steps, or build commands here; those belong in Constraints or are derived later in OPERATION ORDER.
- `### Constraints` — a flat bullet list of decisions. One bullet per decision. Each bullet starts with a **bold one-line label** stating the decision, then `: ` and a single sentence of reasoning. Keep the bold label short — avoid long code spans, file paths, or multi-clause titles inside the bold (put those in the reasoning half after the colon). No `####` headings, no prose paragraphs. Use a sub-bullet only when one sentence genuinely cannot carry the decision (e.g., the decision has two or three concrete items the reader needs to see); keep sub-bullets to one short clause each and avoid them whenever possible. Two optional sub-bullet forms:
  - `- ? <prompt> (opt-a / opt-b) >` — a single open alt for the user to answer (or for `/opord` to resolve). Only when the high bar in step 4 is met.
  - `- Rejected: opt-a, opt-b` — alternatives the user dismissed or `/opord` collapsed. Comma-joined, no reasons unless the user added them.

  Decisions belong here, not inside individual tasks.

  Constraints give **direction**, not interface shape — keep function signatures, flag names, base-dir args, and resolution helpers out of the WARNO; that code-level detail belongs to `/opord`. Pin an interface in a Constraint only when the user asks for that detail specifically, or when it is genuinely the only viable solution. The bar: a reviewer can read the WARNO without opening a single file.

- `### Target Reference Points` — a curated, scannable map of the files / folders / glob patterns a fresh `/opord` session would need to read to cut OPERATION ORDER. Flat bullet list. Each entry is `` `{path-or-glob}` — {tag} ``:
  - The path or glob is **backtick-wrapped**. Folders end with `/`. Globs use standard wildcards (e.g., `src/server/services/*.ts`, `.claude/skills/*/SKILL.md`).
  - The tag is a **noun-only label** — at most a few words naming the role. **No verbs, no clauses, no relative pronouns** (`that…`, `which…`, `containing…`). If you find yourself writing a clause, cut it down to the noun.
  - No trailing period. No backticks around the tag.
  - **No sub-bullets.** If a file matters in two ways, write two bullets or pick the dominant role.
  - **Filter aggressively** (see step 4): list a folder or glob when several siblings are relevant; skip files obvious from project conventions; skip files only opened to disprove a hypothesis.
  - This is a map for downstream skills, not a duplicate of OPERATION ORDER's per-task Method of Engagement / Target Description.

Examples:

```
### Constraints

- **Use `git mv` to rename the directory**: preserves blame across the rename.
- **No legacy references in live doc surfaces**: read as if the new name had always been the name.
- **`docs/ai-workflow.md` needs a structural pass**: textual substitution alone won't fix it
  - currently lists the wrong skill chain
  - describes the wrong skill as the OPERATION ORDER cutter
```

```
### Target Reference Points

- `packages/naholo-cli/src/lib/local-operations.ts` — path helpers
- `packages/naholo-cli/src/commands/agent/` — agent subcommands
- `.claude/skills/*/SKILL.md` — skill docs
- `docs/ai-workflow.md` — workflow doc
```

### 7. Print summary

Show the warno state. Use markdown link syntax. Resolve `<line>` by reading back `OPERATION.md` after writing the WARNO and locating the `## WARNING ORDER` heading; the link label stays semantic per the manual's `## Chat output` → `### Link format` rule (no `#L<line>` in the label).

Output template — print raw, per the manual's `## Chat output` rule:

```md
Warno complete for OP #42: "Implement user auth"

- WARNO: Concept of Operations + 4 Constraints + 6 TRP entries
- Open alts: 1 (awaiting answer or `/opord` resolution)
- Researched:
  - [src/auth/](src/auth/)
  - [src/server/services/operator.ts](src/server/services/operator.ts)
- WARNO: [WARNING ORDER]({operationDir}/notes/OPERATION.md#L<line>)

Next:

- Looks good → run `/opord` to cut the WARNO into tasks
- Refine the WARNO → give a prompt directly (post-warno phase), or hand-edit the WARNING ORDER
- Optionally → `/sitrep` to push current WARNO to the server
```

## Post-warno phase

Once this skill returns, the session is in the **warno** phase. The phase persists until a different phase-changing skill runs (`/infil`, `/opord`, `/splash`), `/exfil` cleans up the workflow, or the session ends. `/sitrep` is a sync-only operation and does **not** end the phase.

While in the warno phase:

- **In-phase follow-up edits** — any WARNO-related touch-up the user asks for (rewording Concept of Operations, adding / dropping / flipping a Constraint, refreshing Target Reference Points) is part of this phase. Apply the edit and fire a single `naholo agent add-timeline -T warno '<summary>'` per discrete event so a future fresh session sees what changed.
- **Wrong-phase requests** — route exactly as `## Wrong-intent pushback` at the top of this skill: if the request belongs to a different skill, name the owning skill and stop — do **not** silently do the work. Direct-call args and post-phase follow-ups push back identically.

## Rules

- **WARNO-only**: `/warno` appends `## WARNING ORDER` (heading + subsections) when absent and revises it in place when present. It does NOT write `## OPERATION ORDER` and does NOT mirror to `TASKS.md`. Those are `/opord`'s job.
- **Decisions commit to one path**: every Constraint and the Concept of Operations itself names the chosen approach. "Pick A or B" phrasing is a bug — redraft. The narrow exception is the `- ? ... >` sub-bullet, which is reserved for the two cases in step 4.
- **Constraints give direction, not interface shape**: keep function signatures, flag names, base-dir args, and resolution helpers out of the WARNO — `/opord` owns interface shape. Pin it in a Constraint only when the user asks for that detail specifically, or when it is genuinely the only viable solution.
- **Rejected sub-bullets**: comma-join alternatives, no reasons unless the user added them.
- **TRP is a curated map, not a research log**: noun-only tags, no verbs/clauses/relative pronouns; backtick-wrapped paths; folders end with `/`; prefer a folder or glob over enumerating siblings.
- **OPERATION.md has exactly three top-level sections**: SITUATION, WARNING ORDER, OPERATION ORDER. Nothing else. Per-task progress lives in OPERATION ORDER's AARs; chronological events live in TIMELINE.md.
- **Do NOT implement any code** — only edit `OPERATION.md`; TIMELINE.md is updated via `naholo agent add-timeline`.
- Print the summary as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with `opPath` from boot's `<op_status>`.
