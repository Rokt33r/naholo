---
name: infil
description: Infil a Naholo operation — fetch objectives, notes, and logs locally for offline-first workflow.
argument-hint: '[{operationNumber}]'
model: sonnet
---

# Infil — Infil Operation

Fetch an operation's full context from Naholo and set up a local working directory for the `/recon` → `/splash` → `/sitrep` (mid-session) → `/exfil` (done) workflow.

Infil is a one-way bring-down from server to local. It never pushes. If `OPERATION.md` or `TIMELINE.md` need to be created, they are written locally only — the user runs `/sitrep` or `/exfil` later to sync upstream.

## Arguments

Optional operation number (e.g., `42`).

- **Provided** → fresh infil. Runs `naholo agent infil <n>` to fetch the op from the server and create the infiled directory. Errors if an op is already infiled.
- **Omitted** → re-infil (refresh). Runs `naholo agent pull` against the currently infiled op. Errors if nothing is infiled.

## What to do

1. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

2. **Load manual**: If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

3. **Fetch via CLI**: Branch on whether `{operationNumber}` was provided.
   - **Fresh infil ({operationNumber} provided)**: Run `naholo agent infil {operationNumber}`. If the CLI errors with "Already infiled. Run \"naholo agent exfil\" first.", tell the user that an op is already infiled — they can `/infil` (no args) to refresh it, or `/exfil` first to switch ops. Then stop.
   - **Re-infil ({operationNumber} omitted)**: Run `naholo agent pull`. If the CLI errors with "No infiled operation", tell the user to pass an operation number (`/infil <n>`) for a fresh infil and stop.

   Either way, capture the absolute operation directory from the `Local:` line — call this `{operationDir}`.

4. **Read context**:
   - **Title**: from the `Title:` line of infil's stdout.
   - **Logs**: `{operationDir}/LOGS.yml` (YAML array of `{ id, createdAt, author, content }`).
   - **Notes**: every `*.md` file in `{operationDir}/notes/`.

5. **Handle OPERATION.md** (using the context from step 4):

   OPERATION.md is the single live document for the OP (see manual for the full schema). `/infil` only seeds `## SITUATION` when generating from scratch; `## MISSION` is appended later by `/recon`, `## EXECUTION` by `/objs`.

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

   - **Pain**: keep brief — ≤3 sentences. Details land in MISSION during `/recon`.
   - **Suggested solution**: include only if logs/notes hint at a solution; otherwise omit the heading entirely. No `N/A` filler.
   - **Notes**: include only if logs/notes surface info worth flagging that doesn't fit Pain or Suggested solution (non-blocking constraints, related operations, stakeholder mentions, prior-art pointers); one-line bullets, no nested detail; otherwise omit the heading entirely.
   - If other notes exist, add pointers (e.g., "See `api-design.md` for endpoint specs") inside SITUATION subsections where relevant.
   - Do NOT write `## MISSION` or `## EXECUTION` headings — `/recon` and `/objs` append those when they run.

   **If OPERATION.md already exists**:
   - Find what changed since the last TIMELINE bullet: new logs (LOGS.yml entries with `createdAt` later than the last TIMELINE date) and note changes (created/updated, from infil's CLI report).
   - If nothing new → note "OPERATION.md is up to date" in the summary.
   - If something new → summarize it (e.g., "3 new logs, `research.md` updated") and **ask the user** whether to append a TIMELINE bullet. On confirmation, append one bullet to `TIMELINE.md` summarizing the new logs and note changes.

6. **Handle TIMELINE.md** (sibling of OPERATION.md):

   **If `{operationDir}/notes/TIMELINE.md` does not exist**:
   - Write it locally via `Write`. Template:

     ```markdown
     # TIMELINE — OP #{operationNumber}

     - **{YYYY-MM-DD HH:MM} — {author}**: {summary of log entry}
     - **{YYYY-MM-DD HH:MM} — {author}**: {summary of log entry}
     ```

   - One bullet per LOGS.yml entry, using each entry's `createdAt` and `author`. Summarize content in one line.

   **If TIMELINE.md already exists**: leave it alone (re-runs of infil are handled via the OPERATION.md "what changed" branch above).

7. **Print summary**: Output a summary using markdown link syntax for clickable paths. Print as raw markdown — no surrounding fence. List workflow notes first in the fixed order OPERATION → OBJECTIVES → TIMELINE, then other notes alphabetically.

   If the CLI reported note conflicts, append a `**Conflicts to resolve manually:**` section listing each conflicted note as a clickable bullet so the user can open it in their editor — the user resolves them outside this skill.

   Example (printed directly, not fenced):

   Infiled operation #42: "Implement user auth"
   - Objectives: 0 (none yet — to be defined in `/recon`)
   - Notes: OPERATION [created], TIMELINE [created], api-design, research
   - Logs: 8 entries
   - Local: [{operationDir}/]({operationDir}/)
   - Operation: [OPERATION.md]({operationDir}/notes/OPERATION.md)
   - Timeline: [TIMELINE.md]({operationDir}/notes/TIMELINE.md)

   Substitute `{operationDir}` with the absolute path printed on the infil's `Local:` line. Include the CLI output details (objectives updated/inserted, notes merged) in the summary.

## Rules

- **Use `naholo agent infil` for all file I/O from server** — do not manually create directories, manage `.base/` files, or sync objectives/notes. The CLI handles all of that.
- **Infil never pushes**. If OPERATION.md or TIMELINE.md is missing, write it locally via the `Write` tool only — no `create_note` MCP call, no re-pull. User syncs upstream later via `/sitrep` or `/exfil`.
- On re-run, the CLI handles 3-way merge automatically. If conflicts are reported, tell the user and wait for resolution.
- Do NOT implement any code — only fetch and write local files.
- Do NOT write `## MISSION` or `## EXECUTION` headings — `/recon` appends MISSION, `/objs` appends EXECUTION.
- Objective notes from the server should be folded into OPERATION.md SITUATION context, NOT written to OBJECTIVES.md (OBJECTIVES.md is a pure checklist, populated by `/recon`).
- Print the summary as raw markdown — no surrounding fence.
