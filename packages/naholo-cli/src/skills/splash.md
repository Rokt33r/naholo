---
name: splash
description: Ship one task from an infilled Naholo operation — implement code, write the AAR, check the TASKS box.
argument-hint: '[N] ["freeform"]'
---

# Splash — Ship One Task

Implement exactly one task from `OPERATION.md` `## OPERATION ORDER`, write the After-Action Report into the same task section, flip the TASKS.md checkbox, and stop. The user reviews the AAR, then re-runs `/splash` for the next task.

## Arguments

First positional token (optional):

- **Integer `N`** — ship TASK N specifically. Required to skip ahead past earlier unchecked tasks, or to re-run on an already-shipped task and revise its AAR. Even when the user just inserted a new task via `/opord`, the default is still first-unchecked — they must pass `N` to target it.
- **No integer** — ship the **first** unchecked task in `TASKS.md`, top to bottom. Task numbers define order; never reorder based on recency, recent `/opord` activity, or implied intent.

Anything in quotes after is freeform context for the splash — implementation hints, reference docs, AAR tweaks. If that context actually asks for work another skill owns (a plan revision, a WARNO rewrite, a server push), check it against `## Wrong-intent pushback` and push back instead of widening the splash. Common patterns:

- `/splash 3 ref docs/style.md` — extra reference docs to read
- `/splash 2 use the existing helper in src/utils/foo.ts` — implementation hint
- `/splash 5 tweak: the AAR should mention the migration` — revision instruction when re-running on a shipped task

## Wrong-intent pushback

`/splash` ships exactly one task's code and AAR — nothing else. The freeform half of the args is implementation context, not a revision instruction; if it (or a follow-up request after the phase) asks for work `/splash` does not own, do **not** silently do it — name the owning skill, tell the user to run it, and stop. This routing is identical whether the wrong-intent prompt arrives as the args of a direct `/splash` call or as a follow-up after the phase (see Post-splash phase):

- Editing a different (not just-shipped) task, inserting/dropping tasks, or any plan revision → `/opord`
- WARNO rewrite (Concept of Operations / Constraints / Target Reference Points) → `/warno`
- Pushing to the server → `/sitrep` (checkpoint) or `/exfil` (final)
- Shipping the next task → re-run `/splash`

In-scope work — implementing the targeted task and writing its AAR, with the freeform context folded in as a hint — proceeds through the normal flow below. (Scope expansion that still belongs to _this_ task is handled by step 5's two-option gate, not here.)

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

Validate: `## OPERATION ORDER` must exist in `OPERATION.md` and contain at least one `### TASK N — Title` section. If `## OPERATION ORDER` is absent (no heading at all) or has no `### TASK N` sections under it, tell the user to run `/opord` first (and `/warno` first if `## WARNING ORDER` is also absent) and stop.

### 3. Pending CHOP gate

If step 1's `opNotes` has no `CHOP` entry, skip this step silently — emit no chat output about it and proceed. Otherwise a CHOP proposal is in flight (the session is in the chop phase): before doing any other work (no codebase research, no file edits, no `add-timeline`), surface this gate so the user can decide whether to desync the proposal or resolve it first.

Call `AskUserQuestion` with:

- **question**: `"A CHOP proposal is pending at notes/CHOP.md — running /splash now will desync it from the parent OP. How do you want to proceed?"`
- **header**: `"CHOP pending"`
- **options** (labels only, no descriptions):
  1. `"Resolve CHOP first (Recommended)"`
  2. `"Proceed anyway"`

Branch on the answer:

- **Resolve CHOP first** → abort the skill immediately. Do not load codebase context, do not edit any file, do not call `add-timeline`. Print this raw (no surrounding fence) and stop:

  ```md
  `/splash` cancelled. Pick one:

  - `/chop …` — continue editing [CHOP]({operationDir}/notes/CHOP.md)
  - `/chopchop` — apply CHOP
  - `/nochop` — abort and abandon CHOP
  ```

- **Proceed anyway** → continue with the skill's normal flow. On the step 10 summary, append this raw as the final line:

  ```md
  After `OPERATION.md` is settled, run `/chop …` to make [CHOP]({operationDir}/notes/CHOP.md) reflect the new state.
  ```

### 4. Pick the target task

- If `N` was provided → target TASK N. If no matching `### TASK N` section exists, stop and tell the user.
- Otherwise → target the **first** unchecked task in TASKS.md, top to bottom. Task numbers are the order. Do **not** infer a different target from session context (e.g. a task the user just inserted via `/opord`) — without an explicit `N`, first-unchecked wins. If all are `[x]`, tell the user there's nothing left and suggest `/exfil`.

If the targeted task already has a `#### After-Action Report` heading with a non-empty body, this is a **revision splash** — see step 7 (AAR update path). If the task has no `#### After-Action Report` heading at all, this is a **fresh splash** — `/splash` adds the heading itself when shipping.

### 5. Read the task contract

From OPERATION.md `### TASK N — Title`:

- `#### Intent` — the success criterion.
- `#### Method of Engagement` — optional narrative: prose plus an optional ASCII artifact (flow diagram, wireframe, schema layout, signature diff, outline). Treat the artifact as the authoritative shape. Absent when the task had nothing to sketch.
- `#### Target Description` — the mandatory **action list** (Add / Edit / Move / Delete / Run / Manual): the planned steps for the splash.
- Anything in `#### After-Action Report` if present (revision splash only). On a fresh splash this heading does not exist yet — `/splash` adds it during step 7.

If freeform args are provided, treat them as additional context to weigh during implementation. Do not let them silently expand scope beyond what the task intent specifies — if they ask for more than, or different from, what the task intent covers, **stop before implementing** and surface two options to the user:

1. **Run `/opord` first** — modify the undone task to absorb the new scope, or insert a new task for it. Pick this when the change is large enough to deserve its own review checkpoint, or when it should be a separate splash.
2. **Splash anyway, capture in AAR** — proceed with the expanded scope this run, and document the deviation explicitly in the `#### After-Action Report` (what was added beyond the original goal, why, and any follow-up implications). Pick this when the change is small and naturally lives with the current task.

Wait for the user to choose before continuing.

### 6. Implement (fresh splash path)

Implement the code changes that satisfy the task intent:

- Execute the steps listed in the Target Description action list — modify or create files for `Add` / `Edit`, relocate files for `Move` (use `git mv` when the file is git-tracked, plain `mv` otherwise), remove files for `Delete`, run shell commands for `Run`.
- For `Manual:` items, **do not execute**. Pause and surface every `Manual:` step in this task via `AskUserQuestion` (one question per step, batched up to four per call; fall back to sequential calls when the task has more than four). Each question uses header `"Manual step"`, the action-list line itself as the question text, and exactly these two options:
  - **Done** — `"I completed the step. Continue the splash."` → proceed.
  - **Defer** — `"Skip for now. Record as an open follow-up as a Notes line in the AAR."` → record the step verbatim in the AAR's `Notes` section as `Deferred manual step: {action}` and continue.

  Manual steps are part of shipping the task; the task still ships either way (Done or Defer), but every Defer becomes a Notes line in the AAR so nothing is silently dropped.

- Add files not in the list if they're genuinely required — note them in the AAR as deviations.
- Stay within the task scope. Do not refactor surrounding code, add features, or fix unrelated issues.

After the action list finishes, run the post-edit verifications defined in `CLAUDE.md` and `.claude/rules/*.md` for the files you changed (formatter on tracked-file changes, type checker on TS source). `/opord` deliberately omits these from the Target Description.

If everything passes, record nothing in the AAR — no news is good news. Record the result only when the user explicitly asks for it.

If a verification fails, fix it when the fix stays within the task's scope and record the fix under Deviations. If the fix would expand scope or doesn't work, flag the failure as a Notes bullet in the AAR.

### 7. Write the AAR (or update it for revision splashes)

Two paths:

- **Fresh splash** (no `#### After-Action Report` heading on the target task yet): append the `#### After-Action Report` after the `#### Target Description` body.
- **Revision splash** (heading already exists with non-empty body): overwrite the existing body in place under the existing heading. Do not append a second AAR section, and do not add a new `#### After-Action Report (revised)` heading. Do NOT edit `#### Intent`, `#### Method of Engagement`, or `#### Target Description` of the task — those are the planning record owned by `/opord`. Every late discovery on a revision splash lands in **Deviations**; if the plan itself needs to change shape, surface it and tell the user to run `/opord`.

In both paths the body has two labels in fixed order:

- **Deviations**: bullet list shaped like a Target Description action list. Each top-level entry uses the same `Add` / `Edit` / `Delete` / `Run` / `Manual` verb + path/target form as an action-list bullet. Sub-bullets describe what differed:
  - Plain sub-bullet: a top-level export / behavior / step that was added or changed at action-list granularity.
  - `(Undone) {sub-bullet text}` — a planned sub-bullet from the original action list that did not ship.
  - For a fully-skipped planned top-level item, write `- (Undone) {original action-list line}` with optional sub-bullets explaining why or what's missing.
  - Internal-only changes (refactors, helper extraction, naming) that don't change a top-level action-list bullet are **not** deviations and don't appear here.
  - When there are no deviations, write `none` inline on the same line as the label — no bullet list, no explanation.
  - Attribution: **Agent-initiated** deviations (you chose to deviate during implementation) include a brief reason — commit your reasoning to the AAR. **User-initiated** deviations (the user's freeform args expanded or redirected scope) record the change only; if the user gave a reason, quote/paraphrase it in one short clause, otherwise do **not** invent one. One sentence per entry.
- **Notes**: anything the reviewer should know — known follow-ups, risks, things deferred to a later task, deferred `Manual:` steps. Omit the heading entirely when there's nothing worth flagging.

The AAR is the canonical record of what's currently true on disk for that task; revision history lives in TIMELINE.md.

### 8. Flip the checkbox

In `TASKS.md`, flip `- [ ] N. Title` → `- [x] N. Title` for the task that just shipped. For revision splashes, the box is already `[x]` — leave it.

### 9. Append a TIMELINE bullet

Run `naholo agent add-timeline` with the bare `splash` stage label:

- Fresh splash: `naholo agent add-timeline -T splash 'task {N} shipped — {one-line summary}.'`
- Revision splash: `naholo agent add-timeline -T splash 'task {N} AAR updated — {one-line summary of the change}.'`

### 10. Print summary

Embed the AAR body inline (raw markdown bold labels — not fenced) so the user reads it without scrolling OPERATION.md.

The chat summary opens with a **Splash stats** block that does not appear in the on-disk AAR. Compute the three counts from the work just performed:

- `- Planned: {N}` — count of top-level action-list bullets in the task's `#### Target Description` as written by `/opord`.
- `- Done: {N}` — count of those planned top-level items that shipped. A planned item counts as Done whether or not its internal sub-bullets deviated; only fully-skipped planned items are excluded. Identity: `Undone = Planned − Done`.
- `- Deviations: {N}` — count of action-list-level differences from plan (matches the number of top-level entries in the **Deviations** section just written to the AAR). Includes (a) planned top-level items whose sub-bullets deviated, (b) new top-level items added during the splash that weren't in the plan, and (c) planned top-level items that were dropped entirely. Deviations is **not** a subset of Done — `/opord` may have missed action-list steps needed to hit the goal, in which case those additions land here without bumping Done.

The tail is a standalone `Progress:` line plus one of two `Next:` states — remaining-tasks or all-done — selected by whether `TASKS.md` still has an unchecked task after this splash. Both carry semantic links; the examples below show the exact bullets, ordering, and labels. Resolve each `<line>` by reading back `OPERATION.md` after the AAR is written and locating the matching heading — the `Review` link anchors the just-shipped task's `#### After-Action Report`, the next-task link the next task's `### TASK N — Title`.

**Remaining-tasks state** — at least one unchecked task remains after this splash:

```md
TASK 3 shipped: "Add /splash skill spec"

**Splash stats**

- Planned: 5
- Done: 4
- Deviations: 2

**Deviations**

- Edit src/foo.ts
  - Added `bar()` helper not in plan because the new flow needed a shared parser
  - (Undone) `legacyParse()` removal — left in place; another task depends on it
- (Undone) Run `pnpm db:migrate` — deferred per CLAUDE.md (user owns DB migrations)

**Notes**

- Deferred manual step: rotate the staging API key after deploy

---

Progress: 3/8 tasks done

Next:

- Review [TASK 3 - AAR]({operationDir}/notes/OPERATION.md#L84)
- Ship the next task → run `/splash` to ship [TASK 4]({operationDir}/notes/OPERATION.md#L99) ("/sitrep skill rewrite")
- Adjust shipped changes → give a prompt directly (post-splash phase), or edit them manually and ask to update the AAR
- Add or adjust unfinished tasks → run `/opord …`
- Optionally → `/sitrep` to push progress to the server
```

**All-done state** — no unchecked task remains after this splash. Keep the Splash stats + AAR embed; the tail drops the `Ship the next task` bullet and closes on `Done → /exfil`:

```md
Progress: All 8 tasks done

Next:

- Review [TASK 8 - AAR]({operationDir}/notes/OPERATION.md#L84)
- Adjust shipped changes → give a prompt directly (post-splash phase), or edit them manually and ask to update the AAR
- Add or adjust unfinished tasks → run `/opord …`
- Done → `/exfil` to sync, post the summary log, and optionally close the op
```

## Post-splash phase

Once this skill returns, the session is in the **splash** phase — anchored to the task that was just shipped (or revised). The phase persists until a different phase-changing skill runs (`/infil`, `/warno`, `/opord`), `/exfil` cleans up the workflow, or the session ends. Re-running `/splash` stays in the splash phase but re-anchors it to the just-shipped task. `/sitrep` is a sync-only operation and does **not** end the phase.

While in the splash phase:

- **In-phase follow-up edits** — late-discovered deviations, AAR rewordings, small implementation tweaks on the just-shipped task, and `Notes` additions in the AAR are part of this phase. Apply the edit and fire a single `naholo agent add-timeline -T splash '<summary>'` per discrete event.
- **Wrong-phase requests** — route exactly as `## Wrong-intent pushback` at the top of this skill: if the request belongs to a different skill, name the owning skill and stop — do **not** silently do the work. Direct-call args and post-phase follow-ups push back identically.

## Rules

- **One task per invocation**: ship exactly one, then stop. The user re-runs `/splash` for the next.
- **Stay in scope**: the task intent is the contract. If you can't ship as described (API changed, file doesn't exist, unexpected architecture), stop and explain. Do not improvise.
- **Don't touch other tasks**: do not edit other tasks' Method of Engagement, Target Description, AARs, or Intents. If the work reveals that another task needs revision, surface it — don't silently rewrite.
- **TASKS.md flip is mandatory**: every fresh splash flips one box. Without it, `/splash` (no args) cannot find the next task.
- **One TIMELINE bullet per splash invocation** — `naholo agent add-timeline` guarantees the format.
- **Don't re-elaborate the task**: if the Intent or Target Description are missing details, implement your best interpretation and note it in the AAR. Do not rewrite the task Intent — that's `/opord`'s job (or `/warno`, if the WARNO itself needs to change).
- Print the summary as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with `opPath` from boot's `<op_status>`.
