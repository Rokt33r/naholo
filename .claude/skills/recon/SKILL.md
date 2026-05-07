---
name: recon
description: Plan an infiled Naholo operation — research the codebase, fill MISSION (Goal, Rationale, Prerequisites, Architecture Decisions) in OPERATION.md. EXECUTION is owned by `/plan`.
argument-hint: '["freeform MISSION instructions"]'
---

# Recon — Define the Mission

WARNORD-style direction-setter. Researches the codebase and fills `## MISSION` (Goal / Rationale / Prerequisites / Architecture Decisions) in `OPERATION.md`. Stops there. `/recon` does **not** write `## EXECUTION`, does **not** mirror to `OBJECTIVES.md`, and does **not** prune open questions — those are owned by `/plan`.

The skill name is the unambiguous "where are we" signal: re-running `/recon` is for direction changes (Goal rewrite, Architecture Decision revision, Prerequisites change). Once MISSION is settled, the user runs `/plan` to cut it into ORP-sized OBJs.

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op-list` (asks if multiple).

Anything passed as an argument is treated as **freeform instructions** describing how to revise MISSION. There is no keyword list — read the instructions like any other prompt and classify the intent in step 5 (re-run dispatch). Common patterns:

- `/recon` (no args) — first run, or resume a partial MISSION draft.
- `/recon "rework architecture decisions about plan mode"` — targeted edit.
- `/recon "rewrite the mission from scratch"` — full restart.

EXECUTION-shaped instructions (insert/remove/revise OBJs) belong to `/plan`, not `/recon`.

## What to do

### 0. Load personality

If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

### 0.5. Load manual

If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

### 1. Find infiled operation

Run `naholo agent op-list`.

- If none exist → tell user to run `/infil {operationNumber}` first and abort.
- If multiple exist → show the list and ask user which one to use.

### 2. Resolve operation directory

Run `naholo agent op-path {operationNumber}` to get the absolute operation directory; call this `{operationDir}`. All file paths in this skill compose on top of it. If `{operationDir}` does not exist on disk, tell the user to run `/infil {operationNumber}` first and stop.

### 3. Read local state

Read:

- `{operationDir}/OBJECTIVES.md`
- `{operationDir}/notes/OPERATION.md`
- `{operationDir}/notes/TIMELINE.md`
- All other notes in `{operationDir}/notes/`

### 4. Research the codebase

Investigate thoroughly to understand:

- Current architecture and patterns relevant to the operation
- Existing code that will be modified or extended
- Dependencies, prerequisites, schema fields, type signatures
- Conventions used in the project (from `CLAUDE.md` and existing code)

The goal is enough context to write a Goal that names the chosen path, a Rationale that connects it to SITUATION.Pain, Prerequisites that are real, and Architecture Decisions with load-bearing reasoning. `/plan` will use the MISSION to cut EXECUTION later — recon's job is to make the planning brief crisp.

If research surfaces questions that need a human answer before MISSION can commit, `/recon` may add an `### Open questions` block under `## SITUATION` (one `### {question}` per question, followed by `Answer ->` on the next line). Pruning unanswered questions is `/plan`'s job — leaving them in place between `/recon` and `/plan` is fine.

### 5. Re-run dispatch + write MISSION

Inspect the current state of OPERATION.md MISSION and any freeform args. Branch:

- **MISSION empty (or `_(empty …)_` placeholder), no args** → fresh write. Populate Goal, Rationale, Prerequisites, Architecture Decisions. Append `- **{YYYY-MM-DD HH:MM} — recon**: Drafted MISSION.` to TIMELINE.md.
- **MISSION partially populated, no args** → resume. Add missing subsections, complete partial ones. Append `- **{YYYY-MM-DD HH:MM} — recon (resumed)**: …` to TIMELINE.md.
- **Args provided, classify intent**:
  - **Targeted edit** — args describe partial changes to MISSION (Goal, Rationale, Prerequisites, Architecture Decisions). Apply the described edits in place. Append `- **{YYYY-MM-DD HH:MM} — recon (revised)**: {summary}` to TIMELINE.md.
  - **Full restart** — args explicitly say start over (e.g., "rewrite the mission from scratch"). Replace MISSION wholesale. If `## EXECUTION` already has content, use `AskUserQuestion` to ask whether to **keep EXECUTION** (let `/plan` reconcile it against the new MISSION later) or **flush EXECUTION** (delete every OBJ section — including shipped ones — and leave EXECUTION empty for `/plan` to rewrite from scratch). Do not proceed until the user answers. TIMELINE.md is preserved either way. Append `- **{YYYY-MM-DD HH:MM} — recon (restart)**: {summary, including kept/flushed EXECUTION}` to TIMELINE.md.

### 6. Write OPERATION.md MISSION

`## MISSION` has exactly four subsections (in order):

- `### Goal` — what we will do. Free-form prose stating the change; bulleted lists are welcome where they help readability (e.g., when the goal enumerates several mechanical edits). This is the only place Goal lives in OPERATION.md — `/infil` no longer seeds a SITUATION.Goal.
- `### Rationale` — how the goal resolves SITUATION.Pain. Connects each load-bearing piece of the goal back to the friction it removes; surfaces the ship-order reasoning when relevant.
- `### Prerequisites` — bullet list of things that must exist or be true before any OBJ can ship.
- `### Architecture Decisions` — one `####`-headed entry per decision; body is one short paragraph (or a few lines) covering the load-bearing reasoning and rejected alternatives only — no restatement of context the reader already has from MISSION. Decisions belong here, not inside individual OBJs.

### 7. Print summary

Show the recon state. Use markdown link syntax. Print as raw markdown — no surrounding fence.

Example (printed directly, not fenced):

Recon complete for OP #42: "Implement user auth"

- Mission: Goal + Rationale + Prerequisites + 4 Architecture Decisions
- Open questions: 2 (awaiting answer before `/plan`)
- Researched:
  - [src/auth/](src/auth/)
  - [src/server/services/operator.ts](src/server/services/operator.ts)
- Operation: [OPERATION.md]({operationDir}/notes/OPERATION.md)

Next:

- Looks good → run `/plan` to cut MISSION into OBJs
- Direction change → re-run `/recon "freeform instructions"` or edit MISSION directly
- Optionally → `/sitrep` to push current MISSION to the server

## Rules

- **MISSION-only**: `/recon` writes (or revises) `## MISSION`. It does NOT write `## EXECUTION`, does NOT mirror to `OBJECTIVES.md`, and does NOT prune open questions. Those are `/plan`'s job.
- **Decisions commit to one path**: every Architecture Decision and the Goal itself names the chosen approach. "Pick A or B" phrasing is a bug — redraft.
- **OPERATION.md has exactly three top-level sections**: SITUATION, MISSION, EXECUTION. No anything else. Open questions live under SITUATION; per-OBJ progress lives in EXECUTION's AARs; chronological events live in TIMELINE.md.
- **Do NOT implement any code** — only edit `OPERATION.md` and `TIMELINE.md`.
- Print the summary as raw markdown — no surrounding fence.
