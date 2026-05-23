---
name: warno
description: Plan an infiled Naholo operation — research the codebase, fill MISSION (Concept of Operations, Warning Orders, Target Reference Points) in OPERATION.md. EXECUTION is owned by `/opord`.
argument-hint: '["freeform MISSION instructions"]'
---

# Warno — Define the Mission

The MISSION-writing skill. Researches the codebase and writes `## MISSION` (Concept of Operations / Warning Orders / Target Reference Points) into `OPERATION.md` — appending the section when absent, revising in place when it already exists. Stops there. `/warno` does **not** write `## EXECUTION` and does **not** mirror to `TASKS.md` — those are owned by `/opord`.

The skill name is the unambiguous "where are we" signal: re-running `/warno` is for direction changes (Concept of Operations rewrite, Warning Order revision). Once MISSION is settled, the user runs `/opord` to cut it into ORP-sized tasks.

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op`.

Anything passed as an argument is treated as **freeform instructions** describing how to revise MISSION. There is no keyword list — read the instructions like any other prompt and classify the intent in step 7 (re-run dispatch). Common patterns:

- `/warno` (no args) — first run, or resume a partial MISSION draft.
- `/warno "rework architecture decisions about plan mode"` — targeted edit.
- `/warno "rewrite the mission from scratch"` — full restart.

EXECUTION-shaped instructions (insert/remove/revise tasks) belong to `/opord` (or `/frago` for mid-cycle insertion), not `/warno`.

## What to do

### 1. Load personality

If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

### 2. Load manual

If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

### 3. Find infiled operation

Run `naholo agent op`. If it errors with "No infiled operation", tell the user to run `/infil {operationNumber}` first and abort. Otherwise capture the printed `#{operationNumber} {title}` for context.

### 4. Resolve operation directory

Run `naholo agent op-path` to get the absolute operation directory; call this `{operationDir}`. All file paths in this skill compose on top of it.

### 5. Read local state

Read if you haven't read:

- `{operationDir}/TASKS.md`
- `{operationDir}/notes/OPERATION.md`
- `{operationDir}/notes/TIMELINE.md`

### 6. Research the codebase

Investigate thoroughly to understand:

- Current architecture and patterns relevant to the operation
- Existing code that will be modified or extended
- Schema fields, type signatures, dependencies
- Conventions used in the project (from `CLAUDE.md` and existing code)

The goal is enough context to write a Concept of Operations that names the chosen path and connects to SITUATION.Pain, and Warning Orders that name each decision. `/opord` will use the MISSION to cut EXECUTION later — warno's job is to make the planning brief crisp.

As you research, keep a curated shortlist of the files, folders, and glob patterns a fresh `/opord` session would actually need to read to cut EXECUTION — these become `### Target Reference Points` (TRP) in step 8. Filter aggressively: skip files you only opened to disprove a hypothesis, files that are obvious from project conventions (e.g. `package.json`), and siblings already covered by a folder or glob entry. If a directory has more than a handful of relevant siblings, list the directory or a glob — never enumerate dozens of files. TRP is a scannable map, not a research log.

Default: commit to the most viable option you find — put it in the WO bold label and let the user override on review. Append a `- ? <prompt> (opt-a / opt-b) >` sub-bullet under a Warning Order **only** in these two cases:

1. The user has named viable options in context (SITUATION, chat, prior `/warno` args) but has not picked one — surface their options back so they can pick.
2. You recognize a well-known alternative that is definitively better than the path you're about to commit to (industry-standard pattern, project's existing convention being violated) — surface the comparison instead of silently adopting the inferior path.

Otherwise do **not** ask. No alts for naming, paths, style, or anything you're already confident about. Most operations will have zero `- ?` sub-bullets. `/opord` later resolves any that remain.

### 7. Re-run dispatch + write MISSION

Inspect the current state of OPERATION.md MISSION and any freeform args. Branch:

- **MISSION absent (no `## MISSION` heading at all), no args** → fresh write. Append `## MISSION` itself plus all three subsections (Concept of Operations, Warning Orders, Target Reference Points) after the last `## SITUATION` content. Append `- **{YYYY-MM-DD HH:MM} — warno**: Drafted MISSION.` to TIMELINE.md.
- **MISSION present but partially populated, no args** → resume in place. Add missing subsections (including TRP if absent), complete partial ones. Append `- **{YYYY-MM-DD HH:MM} — warno (resumed)**: …` to TIMELINE.md.
- **Args provided, classify intent**:
  - **Targeted edit** — args describe partial changes to MISSION (Concept of Operations, Warning Orders, Target Reference Points). Apply the described edits in place; refresh TRP if the edit changes which paths are relevant. Append `- **{YYYY-MM-DD HH:MM} — warno (revised)**: {summary}` to TIMELINE.md.
  - **Full restart** — args explicitly say start over (e.g., "rewrite the mission from scratch"). Replace MISSION wholesale (including TRP). If `## EXECUTION` already has content, use `AskUserQuestion` to ask whether to **keep EXECUTION** (let `/opord` reconcile it against the new MISSION later) or **flush EXECUTION** (delete every task section — including shipped ones — and leave EXECUTION empty for `/opord` to rewrite from scratch). Do not proceed until the user answers. TIMELINE.md is preserved either way. Append `- **{YYYY-MM-DD HH:MM} — warno (restart)**: {summary, including kept/flushed EXECUTION}` to TIMELINE.md.

### 8. Write OPERATION.md MISSION

`## MISSION` has three subsections in fixed order (add any that are missing):

- `### Concept of Operations` — **two or three sentences max**. Names the chosen approach and connects it to `SITUATION.Pain`. Concept-level only — do **not** enumerate files, edit steps, or build commands here; those belong in Warning Orders or are derived later in EXECUTION.
- `### Warning Orders` — a flat bullet list of decisions. One bullet per decision. Each bullet starts with a **bold one-line label** stating the decision, then `: ` and a single sentence of reasoning. Keep the bold label short — avoid long code spans, file paths, or multi-clause titles inside the bold (put those in the reasoning half after the colon). No `####` headings, no prose paragraphs. Use a sub-bullet only when one sentence genuinely cannot carry the decision (e.g., the decision has two or three concrete items the reader needs to see); keep sub-bullets to one short clause each and avoid them whenever possible. Two optional sub-bullet forms:
  - `- ? <prompt> (opt-a / opt-b) >` — a single open alt for the user to answer (or for `/opord` to resolve). Only when the high bar in step 6 is met.
  - `- Rejected: opt-a, opt-b` — alternatives the user dismissed or `/opord` collapsed. Comma-joined, no reasons unless the user added them.

  Decisions belong here, not inside individual tasks.

- `### Target Reference Points` — a curated, scannable map of the files / folders / glob patterns a fresh `/opord` session would need to read to cut EXECUTION. Flat bullet list. Each entry is `` `{path-or-glob}` — {tag} ``:
  - The path or glob is **backtick-wrapped**. Folders end with `/`. Globs use standard wildcards (e.g., `src/server/services/*.ts`, `.claude/skills/*/SKILL.md`).
  - The tag is a **noun-only label** — at most a few words naming the role. **No verbs, no clauses, no relative pronouns** (`that…`, `which…`, `containing…`). If you find yourself writing a clause, cut it down to the noun.
  - No trailing period. No backticks around the tag.
  - **No sub-bullets.** If a file matters in two ways, write two bullets or pick the dominant role.
  - **Filter aggressively** (see step 6): list a folder or glob when several siblings are relevant; skip files obvious from project conventions; skip files only opened to disprove a hypothesis.
  - This is a map for downstream skills, not a duplicate of EXECUTION's per-task Course of Action.

Examples:

```
### Warning Orders

- **Use `git mv` to rename the directory**: preserves blame across the rename.
- **No legacy references in live doc surfaces**: read as if the new name had always been the name.
- **`docs/ai-workflow.md` needs a structural pass**: textual substitution alone won't fix it
  - currently lists only six skills (omits the FRAGO skill)
  - describes the wrong skill as the EXECUTION-cutter
```

```
### Target Reference Points

- `packages/naholo-cli/src/lib/local-operations.ts` — path helpers
- `packages/naholo-cli/src/commands/agent/` — agent subcommands
- `.claude/skills/*/SKILL.md` — skill docs
- `docs/ai-workflow.md` — workflow doc
```

### 9. Print summary

Show the warno state. Use markdown link syntax. Print as raw markdown — no surrounding fence.

Example (printed directly, not fenced):

Warno complete for OP #42: "Implement user auth"

- Mission: Concept of Operations + 4 Warning Orders + 6 TRP entries
- Open alts: 1 (awaiting answer or `/opord` resolution)
- Researched:
  - [src/auth/](src/auth/)
  - [src/server/services/operator.ts](src/server/services/operator.ts)
- Mission: [MISSION]({operationDir}/notes/OPERATION.md#L<line>)

Resolve `<line>` by reading back `OPERATION.md` after writing MISSION and locating the `## MISSION` heading. The link label stays semantic per the manual's `## Chat output` → `### Link format` rule — no `#L<line>` in the label.

Next:

- Looks good → run `/opord` to cut MISSION into tasks
- Direction change → re-run `/warno "freeform instructions"` or edit MISSION directly
- Optionally → `/sitrep` to push current MISSION to the server

## Rules

- **MISSION-only**: `/warno` appends `## MISSION` (heading + subsections) when absent and revises it in place when present. It does NOT write `## EXECUTION` and does NOT mirror to `TASKS.md`. Those are `/opord`'s job.
- **Decisions commit to one path**: every Warning Order and the Concept of Operations itself names the chosen approach. "Pick A or B" phrasing is a bug — redraft. The narrow exception is the `- ? ... >` sub-bullet, which is reserved for the two cases in step 6.
- **Rejected sub-bullets**: comma-join alternatives, no reasons unless the user added them.
- **TRP is a curated map, not a research log**: noun-only tags, no verbs/clauses/relative pronouns; backtick-wrapped paths; folders end with `/`; prefer a folder or glob over enumerating siblings.
- **OPERATION.md has exactly three top-level sections**: SITUATION, MISSION, EXECUTION. Nothing else. Per-task progress lives in EXECUTION's AARs; chronological events live in TIMELINE.md.
- **Do NOT implement any code** — only edit `OPERATION.md` and `TIMELINE.md`.
- Print the summary as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with the absolute path from `naholo agent op-path`.
