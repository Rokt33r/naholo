---
name: infil
description: Infil a Naholo operation — fetch tasks, notes, and logs locally for offline-first workflow.
argument-hint: '[{operationNumber}]'
model: sonnet
---

# Infil — Infil Operation

Fetch an operation's full context from Naholo and set up a local working directory for the `/warno` → `/splash` → `/sitrep` (mid-session) → `/exfil` (done) workflow.

Infil is a one-way bring-down from server to local. It never pushes. If `OPERATION.md` needs to be created, it is written locally only — the user runs `/sitrep` or `/exfil` later to sync upstream.

## Arguments

Optional operation number (e.g., `42`).

- **Provided** → fresh infil. Runs `naholo agent infil <n>` to fetch the op from the server and create the infiled directory. Errors if an op is already infiled.
- **Omitted** → re-infil (refresh). Runs `naholo agent reinfil` against the currently infiled op. Errors if nothing is infiled.

## What to do

1. **Fetch via CLI**: Branch on whether `{operationNumber}` was provided.
   - **Fresh infil ({operationNumber} provided)**: Run `naholo agent infil {operationNumber}`. If the CLI errors with "Already infiled. Run \"naholo agent exfil\" first.", tell the user that an op is already infiled — they can `/infil` (no args) to refresh it, or `/exfil` first to switch ops. Then stop.
   - **Re-infil ({operationNumber} omitted)**: Run `naholo agent reinfil`. If the CLI errors with "No infiled operation", tell the user to pass an operation number (`/infil <n>`) for a fresh infil and stop.

   Either way, capture the absolute operation directory from the `Local:` line — call this `{operationDir}`.

2. **Boot once**: If you haven't run `naholo agent boot` this session, run it now via the Bash tool. Adopt `<personality>` as your voice (skip if empty), adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` — read `currentOp` / `opTitle` / `opNotes` inline if needed but do not store them (they drift later in this same skill once OPERATION.md / TIMELINE.md land). On a fresh infil this is the first session-boot; on a re-infil after a CHOP cycle it may also be the first boot of this session, so do not assume it's already loaded.

3. **Read context**:
   - **Title**: from `opTitle` in `<op_status>` (matches the `Title:` line of infil's stdout).
   - **Logs**: `{operationDir}/LOGS.yml` (YAML array of `{ id, createdAt, author, content }`).
   - **Notes**: every `*.md` file in `{operationDir}/notes/`.

4. **Handle OPERATION.md** (using the context from step 3):

   OPERATION.md is the single live document for the OP (see manual for the full schema). `/infil` only seeds `## SITUATION` when generating from scratch; `## MISSION` is appended later by `/warno`, `## EXECUTION` by `/opord`.

   **If `{operationDir}/notes/OPERATION.md` does not exist**:
   - Write it locally via the `Write` tool. Do NOT push during infil.
   - Template:

     ```markdown
     # OP #{operationNumber}: {title}

     ## SITUATION

     ### Pain

     What's wrong or missing. ≤3 sentences from title + logs + notes.
     If not stated, mark with "_Agent-generated assumption:_".

     ### Suggested solution

     (only when logs/notes hint at a solution — otherwise omit this heading entirely)

     A first-pass idea, in the user's words where possible. ≤3 sentences.

     ### Notes

     (only when there's at least one supplementary point worth surfacing — otherwise omit this heading entirely)

     - One-line summary of a non-blocking constraint, related operation, stakeholder mention, or prior-art pointer. Point at `notes/*.md` or `LOGS.yml` for detail.
     ```

   - **Pain**: keep brief — ≤3 sentences. Details land in MISSION during `/warno`.
   - **Suggested solution**: include only if logs/notes hint at a solution; otherwise omit the heading entirely. No `N/A` filler.
   - **Notes**: include only if logs/notes surface info worth flagging that doesn't fit Pain or Suggested solution (non-blocking constraints, related operations, stakeholder mentions, prior-art pointers); one-line bullets, no nested detail; otherwise omit the heading entirely.
   - If other notes exist, add pointers (e.g., "See `api-design.md` for endpoint specs") inside SITUATION subsections where relevant.
   - Do NOT write `## MISSION` or `## EXECUTION` headings — `/warno` and `/opord` append those when they run.

   **If OPERATION.md already exists** (common case: a prior `/sitrep` or `/exfil` already pushed it, and this is a fresh infil after a mid-cycle exfil — e.g., the OP was paused waiting on a prerequisite OP):
   - Read the CLI's notes/tasks merge report (created / updated / merged / conflict counts) and summarize it.
   - If the merge surfaces a substantive note edit a teammate made server-side that materially changes `### Pain`, `### Suggested solution`, or `### Notes` under SITUATION (e.g., user pivoted the problem, added a hard constraint), patch SITUATION in place. Leave MISSION and EXECUTION alone — those are owned by `/warno` and `/opord`.
   - If the agent needs server-side log context, it reads `{operationDir}/LOGS.yml` directly — TIMELINE is skill-event-only.

5. **Print summary**: Output a summary using markdown link syntax for clickable paths. Print as raw markdown — no surrounding fence. List workflow notes first in the fixed order OPERATION → TASKS → TIMELINE, then other notes alphabetically.

   If the CLI reported note conflicts, append a `**Conflicts to resolve manually:**` section listing each conflicted note as a clickable bullet so the user can open it in their editor — the user resolves them outside this skill.

   Example (printed directly, not fenced):

   Infiled operation #42: "Implement user auth"
   - Tasks: 0 (none yet — to be defined in `/warno`)
   - Notes: OPERATION [created], api-design, research
   - Logs: 8 entries
   - Local: [{operationDir}/]({operationDir}/)
   - Operation: [OPERATION.md]({operationDir}/notes/OPERATION.md)

   Substitute `{operationDir}` with the absolute path printed on the infil's `Local:` line. Include the CLI output details (tasks updated/inserted, notes merged) in the summary.

## Post-infil phase

Once this skill returns, the session is in the **infil** phase. The phase persists until a different phase-changing skill runs (`/warno`, `/opord`, `/splash`), `/exfil` cleans up the workflow, or the session ends. `/sitrep` is a sync-only operation and does **not** end the phase.

While in the infil phase:

- **In-phase follow-up edits** — any further infil-driven edit the user asks for (refining `## SITUATION`, fixing a typo in the seeded OPERATION.md, adding a SITUATION.Notes bullet pointing at a fresh `LOGS.yml` entry) is part of this phase. Fire a single `naholo agent add-timeline -T infil '<summary>'` per discrete event so a future fresh session sees what changed.
- **Wrong-phase requests** — if the user asks for work that belongs to a different skill, do **not** silently do it. Tell the user to run the proper skill and stop:
  - Drafting / revising `## MISSION` → `/warno`
  - Cutting tasks / editing `## EXECUTION` or `TASKS.md` → `/opord`
  - Implementing a task → `/splash`
  - Pushing to the server → `/sitrep` (checkpoint) or `/exfil` (final)

## Rules

- **Use `naholo agent infil` for all file I/O from server** — do not manually create directories, manage `.base/` files, or sync tasks/notes. The CLI handles all of that.
- **Infil never pushes**. If OPERATION.md is missing, write it locally via the `Write` tool only — no `create_note` MCP call, no re-pull. User syncs upstream later via `/sitrep` or `/exfil`.
- On re-run, the CLI handles 3-way merge automatically. If conflicts are reported, tell the user and wait for resolution.
- Do NOT implement any code — only fetch and write local files.
- Do NOT write `## MISSION` or `## EXECUTION` headings — `/warno` appends MISSION, `/opord` appends EXECUTION.
- Task notes from the server should be folded into OPERATION.md SITUATION context, NOT written to TASKS.md (TASKS.md is a pure checklist, populated by `/warno`).
- Print the summary as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with the absolute path from the infil's `Local:` line (matches `opPath` from `boot`'s `<op_status>`).
