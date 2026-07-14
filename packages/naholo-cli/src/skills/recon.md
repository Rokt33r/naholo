---
name: recon
description: Talk-it-out side branch: answer questions, or record a change request as a pinned RECON note (Intent / Scheme / FRAGMENTARY ORDER) that drafts the next /warno / /opord edit.
argument-hint: '["first question"]'
---

# Recon — Talk it out before you fire a prompt

`/recon` is the talk-it-out side branch. The agent answers questions, pulls extra files on demand, and the conversation shapes the freeform args for the next skill. When a session lands a committed change, it records the reasoning as a pinned RECON note.

Two branches based on whether an op is infilled:

- **Infilled** — load `OPERATION.md` + `TIMELINE.md` up front, then answer with the loaded OP as context. The conversation shapes the freeform args for the next phase-changing skill (`/warno …` / `/opord …` / `/splash N …`).
- **No infilled op** — skip the OP context load and answer from the codebase alone (reading on demand). If the request describes trackable work, point the user at `/fob <title>\n<content>` to create + infil; the run-command handoff applies (see Post-recon phase).

## Arguments

A **first question or change request**, in quotes — required. `/recon` with no arg aborts (tell the user to pass one). After loading context, answer it or write the note.

## What to do

### 1. Boot

**If you haven't run `naholo agent boot` in this session**, run it now via the Bash tool. Adopt `<personality>` as your voice when the block is present, adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}`.

**If boot already ran this session**, run `naholo agent op` instead — treat its `<op_status>` payload as the current op status.

`<op_status>` either carries `currentOp` / `opTitle` / `opNotes` (infilled branch) or the literal `No infilled operation.` body (no-op branch). Both are valid `/recon` states.

### 2. Load context (infilled branch only)

If an op is infilled, read these now:

- `{operationDir}/notes/OPERATION.md` — the live OP document; re-read every invocation so manual mid-session edits land
- `{operationDir}/notes/TIMELINE.md` — **first session-boot only**; never re-read after that (it's a fresh-session catch-up doc, not in-session state)

If no op is infilled, skip this step — there is no `OPERATION.md` to load.

### 3. Answer, or write the note

Branch:

- **No arg** → abort; tell the user to pass a first question or change request.
- **Arg provided** → handle it immediately. On the infilled branch, use the loaded OP context. On the no-op branch, answer from the codebase alone (read files on demand when the question needs them).

Each turn (the first arg and every turn after) is one of three things:

- **A question** → answer it concisely, ~200 words max, reading on demand. No writes. Elaborate only when the user asks.
  - A question is only a question: "why did you do that?" wants an explanation, nothing more. Explain it; do not infer a change request or act on assumed intent.
- **A change request, infilled**: anything that alters the plan or its output (amend `OPERATION.md`, change code, add a feature) → write the RECON note (step 4), the surface the user reviews before firing the applying skill.
- **A change request, no op infilled**: trackable work (a fix, a feature, a refactor) → point the user at `/fob <title>\n<content>` to create + infil (see Post-recon phase).

### 4. Write the RECON note

This step is only for a change request on the infilled branch. For other branches, skip this.

Write `{operationDir}/notes/RECONn.md` for that change request. When the target change is ambiguous, ask whether to open a note and wait for an explicit yes before writing.

`n` is the next integer after the highest existing `notes/RECON*.md`, pinned per OP.

The note is a task section for `OPERATION.md` instead of the codebase: `Intent`, an optional `Scheme`, and `FRAGMENTARY ORDER`. Lead each section with an HTML comment explaining it, like:

```md
# RECON 2

## Intent

<!-- the pain and what the user wants ("this exists, so I want X"). -->

Prod emails fail silently. Surface SES send failures in Sentry.

## Scheme

<!--
Optional; the detailed how. Skip it when FRAGMENTARY ORDER already says everything.
Keep it under 200 words at first, growing only as the user elaborates or asks.
-->

Wrap `sendViaSES` in try/catch; on failure, capture to Sentry and rethrow so the caller still sees it.

## FRAGMENTARY ORDER

<!--
What and where, routed against the current op status:

- Folds into the last finished task → a revision /splash N.
- Out of scope of it → an OPORD change (edit a task, or insert one if none fits).
- Against the WARNO direction → a WARNO + OPORD change ("not covered" is not "against").

Write it as an (Add)/(Edit)/(Drop) list against the routed target: a shipped task's revision, a TASK N, or a Constraint + TASK N.
-->

- (Edit) TASK 4 — wrap sendViaSES with try/catch + Sentry
```

Then stamp `naholo agent add-timeline -T recon '<summary>'`. The user reviews the note, then fires the routed skill: `/splash N` (revision), `/opord`, or `/warno` then `/opord`.

## Post-recon phase

Once this skill returns, the session is in the **recon** phase. The phase persists until a different phase-changing skill runs (`/infil`, `/warno`, `/opord`, `/splash`, `/chop`), `/chopchop` / `/nochop` consume a CHOP proposal, `/exfil` cleans up the workflow, or the session ends. `/sitrep` is sync-only and does **not** end the phase.

While in the recon phase:

- **In-phase follow-ups** — each further user turn repeats step 3 (answer, or write / update a RECON note with its `add-timeline -T recon` stamp).
- **Wrong-phase requests** — branch on the user's speech act, not on whether a skill name merely appears:
  - **Run command** — execute the skill only when the user issues an imperative ("run opord", "go ahead with opord", "run splash"). The name counts whether `/`-prefixed, backticked, or bare, and one command may name several skills ("run warno and opord") → invoke each via the `Skill` tool, in the order given, with whatever args the recon conversation has shaped. No push-back.
  - **Mention, not a command** — the skill name sits in a subordinate / conditional clause, a comparison, or as the topic under discussion ("let's review before opord", "how does opord cut tasks?"). This is not an invocation → answer in the recon phase and run nothing.
  - **Phase-shaped work, no skill named** — the user describes the effect without naming a skill ("rewrite TASK 4 to handle nulls", "edit tasks"). This is a change request: **write the RECON note** (see `### 4. Write the RECON note`) and let the user review it, then fire the routed skill (`/splash N`, `/opord`, or `/warno` + `/opord`) themselves. Do not perform the edit or invoke the skill yourself.

  On the no-op branch, the only wrong-phase route is server-side OP creation (`/fob`); every other route below applies the moment an op is infilled:
  - Creating a new op (no infilled op) → `/fob`
  - Drafting / revising `## SITUATION` → `/infil`
  - Drafting / revising `## WARNING ORDER` → `/warno`
  - Cutting tasks / editing `## OPERATION ORDER` or `TASKS.md` → `/opord`
  - Implementing a task → `/splash`
  - Drafting a CHOP proposal → `/chop`
  - Pushing to the server → `/sitrep` (checkpoint) or `/exfil` (final)

## Rules

- **Writes only the RECON note**: the sole write is `notes/RECONn.md` (plus its `add-timeline -T recon` stamp), and only on an `OPERATION.md`-change request. `/sitrep` / `/exfil` sync it; the next `/warno` / `/opord` applies it.
- **Read on demand**: beyond the step 2 load, other files (`LOGS.yml`, other notes, codebase) are read only when a question warrants it. On the no-op branch the codebase is the only read surface, also on demand.
- **Always use absolute filesystem paths in link targets** — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with `opPath` from boot's `<op_status>`.
