---
name: infil
description: Infil a Naholo operation — fetch objectives, notes, and logs locally for offline-first workflow.
argument-hint: '{operationNumber}'
model: sonnet
---

# Infil — Infil Operation

Fetch an operation's full context from Naholo and set up a local working directory for the `/spec` → `/ship` → `/sitrep` (mid-session) → `/exfil` (done) workflow. Use `/sitrep` between `/ship` sessions to sync progress without closing.

## Terminology

| Entity    | Acronym | Familiar Term  | Familiar Context                  |
| --------- | ------- | -------------- | --------------------------------- |
| Operation | OP      | issue          | GitHub Issues                     |
| Objective | OBJ     | task           | tasks within an issue             |
| Operator  | OPR     | project member | GitHub / general PM               |
| Campaign  | —       | milestone/epic | GitHub Milestones / PM tool epics |

Users may refer to entities by any column — entity name, acronym, or familiar term. For example, "task 1.1" means objective 1.1; "issue #42" means operation #42. Resolve all aliases.

## Arguments

The argument is the operation number (e.g., `42`). Required.

## What to do

0. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

1. **Read operation context**: Use the MCP resource `naholo://operations/{operationNumber}` to fetch the full operation (objectives, notes, logs).

2. **Pull via CLI**: Run `naholo agent pull {operationNumber}` using the Bash tool. This command:
   - Fetches objectives, notes, and logs from the server
   - Creates `.naholo/local/operations/{operationNumber}/` with `OBJECTIVES.md`, `notes/*.md`, and `.base/` copies
   - On re-run: performs 3-way merge for notes (line-level via diff3) and structured merge for objectives (by ID)
   - Outputs a human-readable report to stdout with counts and actions taken

   Read the CLI output to understand what happened (fresh pull vs re-run, conflicts, new notes, etc.).

3. **Handle OPERATION.md**:

   OPERATION.md is always the evolving context document — it is never the spec.

   **If no OPERATION note exists on the operation** (check the notes pulled in step 2):
   - Write `notes/OPERATION.md` using this structured template:

     ```markdown
     # OPERATION — Operation #{operationNumber}: {operation title}

     ## Pain

     What's wrong or missing. ≤3 sentences extracted from operation title + logs.
     If not explicitly stated, agent provides assumption marked with "_Agent-generated assumption:_".

     ## Resolution

     How we plan to fix it. ≤3 sentences extracted from operation title + logs.
     If not explicitly stated, agent provides assumption marked with "_Agent-generated assumption:_".

     ## Open questions

     Questions that would help during `/spec`. Use editor-friendly format:

     ### {Question text}

     Answer ->

     ### {Another question}

     Answer ->

     ## Timeline

     - **{YYYY-MM-DD HH:MM} — {author}**: {summary of log entry}
     - **{YYYY-MM-DD HH:MM} — {author}**: {summary of log entry}
     ```

   - **Pain**: extract from operation title, description, and logs. Keep brief — details go in SPEC.
   - **Resolution**: extract from logs. Keep brief — details go in SPEC.
   - **Open questions**: generate the top 3 (or fewer) questions that would help the agent most during `/spec`. Each question gets its own `###` heading with `Answer -> ` on the next line so the user can fill in answers directly in the editor.
   - **Timeline**: chronological summary of all log entries with timestamps and author names. One bullet per log entry.
   - If other notes exist on the operation, add pointers (e.g., "See `api-design.md` for endpoint specs") in the Pain or Resolution sections where relevant. Fold relevant objective notes into Pain/Resolution context.
   - Do NOT elaborate or create an implementation plan — just capture current state.
   - Create the note on the server via `create_note` MCP tool with name `OPERATION`

   **If an OPERATION note already exists** (already pulled in step 2):
   - Verify the structured sections exist: `## Pain`, `## Resolution`, `## Open questions`, `## Timeline`. If OPERATION.md uses the old free-form format (no structured sections), migrate it to the new template automatically and note this in the summary.
   - Compare the OPERATION content against the current logs and notes — look for gaps: new logs posted after the OPERATION was last updated (compare against the last Timeline entry), new notes that aren't referenced, objectives that changed significantly
   - If there are no gaps → do nothing, just note "OPERATION.md is up to date" in the summary
   - If there are gaps → summarize what new information exists (e.g., "3 new logs since OPERATION was written, new note `research.md` not referenced") and **ask the user** whether to update OPERATION.md with this new context. When updating, append new log entries to the `## Timeline` section. Only update if the user confirms.

4. **Handle conflicts**: If the CLI reported any note conflicts (files with conflict markers), tell the user which notes have conflicts and ask them to resolve manually, then wait for confirmation before continuing.

5. **Print summary**: Output a summary using markdown link syntax for clickable paths:

   ```
   Infiled operation #42: "Implement user auth"
   - Objectives: 12 (5 done, 7 remaining)
   - Notes: 3 (api-design, research, OPERATION [created])
   - Logs: 8 entries
   - Local: [.naholo/local/operations/42/](.naholo/local/operations/42/)
   - Operation: [OPERATION.md](.naholo/local/operations/42/notes/OPERATION.md)
   - Spec: [SPEC.md](.naholo/local/operations/42/notes/SPEC.md) (if exists)
   ```

   Include the CLI output details (objectives updated/inserted, notes merged/conflicted) in the summary.

## Rules

- **Use `naholo agent pull` for all file I/O** — do not manually create directories, write OBJECTIVES.md, write notes, or manage `.base/` files. The CLI handles all of this.
- On re-run, the CLI handles 3-way merge automatically. If conflicts are reported, tell the user and wait for resolution.
- Do NOT implement any code — only fetch and write local files.
- Do NOT elaborate or expand the plan — just capture current state.
- Objective notes from the server should be folded into OPERATION.md context, NOT written to OBJECTIVES.md (OBJECTIVES.md is a pure checklist).
