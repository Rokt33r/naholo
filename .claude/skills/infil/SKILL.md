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

2. **Create local directory**: Create `.naholo/local/operations/{operationNumber}/notes/` and `.naholo/local/operations/{operationNumber}/.base/notes/`.

3. **Write OBJECTIVES.md**: Convert the operation's objectives into a markdown checkbox file at `.naholo/local/operations/{operationNumber}/OBJECTIVES.md`.

   Format:

   ```markdown
   # Objectives — Operation #{operationNumber}

   - [ ] Objective name [ref](naholo://objectives/{objectiveId})
     - [x] Done sub-objective [ref](naholo://objectives/{objectiveId})
     - [ ] Pending sub-objective [ref](naholo://objectives/{objectiveId})
   ```

   - Preserve hierarchy via 2-space indentation per depth level
   - Use `- [x]` for objectives with `done: true`, `- [ ]` otherwise
   - Append ` [ref](naholo://objectives/{objectiveId})` to each line for server linkage
   - Order by `position` within each level
   - Also write a copy to `.naholo/local/operations/{operationNumber}/.base/OBJECTIVES.md` — this is the baseline snapshot for future re-run diffs.

4. **Write notes**: For each note on the operation, write its content to `.naholo/local/operations/{operationNumber}/notes/{name}.md`. Also write a copy to `.naholo/local/operations/{operationNumber}/.base/notes/{name}.md` — this is the baseline snapshot for future re-run diffs.

5. **Handle OPERATION.md**:

   OPERATION.md is always the evolving context document — it is never the spec.

   **If no OPERATION note exists on the operation:**
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

   **If an OPERATION note already exists:**
   - Download it to `notes/OPERATION.md` (already done in step 4)
   - Verify the structured sections exist: `## Pain`, `## Resolution`, `## Open questions`, `## Timeline`. If OPERATION.md uses the old free-form format (no structured sections), migrate it to the new template automatically and note this in the summary.
   - Compare the OPERATION content against the current logs and notes — look for gaps: new logs posted after the OPERATION was last updated (compare against the last Timeline entry), new notes that aren't referenced, objectives that changed significantly
   - If there are no gaps → do nothing, just note "OPERATION.md is up to date" in the summary
   - If there are gaps → summarize what new information exists (e.g., "3 new logs since OPERATION was written, new note `research.md` not referenced") and **ask the user** whether to update OPERATION.md with this new context. When updating, append new log entries to the `## Timeline` section. Only update if the user confirms.

6. **Handle SPEC.md**: If a SPEC note exists on the server, it is downloaded like any other note in step 4. No special handling is needed — SPEC.md is treated as a regular note file. On re-run, apply the same 3-way merge logic as other notes.

7. **Print summary**: Output a summary using markdown link syntax for clickable paths:

   ```
   Infiled operation #42: "Implement user auth"
   - Objectives: 12 (5 done, 7 remaining)
   - Notes: 3 (api-design, research, OPERATION [created])
   - Logs: 8 entries
   - Local: [.naholo/local/operations/42/](.naholo/local/operations/42/)
   - Operation: [OPERATION.md](.naholo/local/operations/42/notes/OPERATION.md)
   - Spec: [SPEC.md](.naholo/local/operations/42/notes/SPEC.md) (if exists)
   ```

## Re-run behavior (local dir exists)

If `.naholo/local/operations/{operationNumber}/` already exists, do NOT ask "overwrite or abort." Instead, compare and resolve:

1. **Fetch server state**: Use MCP resource `naholo://operations/{operationNumber}` to get current objectives, notes, and logs (same as fresh infil).

2. **Compare objectives**: Diff local `OBJECTIVES.md` against `.base/OBJECTIVES.md` (local changes) and server objectives (server changes).
   - Show summary: new objectives on server, objectives completed on server, objectives with changed names.
   - Update `OBJECTIVES.md` to reflect server state while preserving local `[x]` marks for objectives done locally but not yet synced.

3. **Compare notes**: For each note, 3-way diff using `.base/notes/{name}.md` as the common ancestor:
   - base == local == server → unchanged, skip
   - base == local, server differs → only server changed, update local silently
   - base == server, local differs → only local changed, keep local, note in summary
   - base != local AND base != server → both sides changed, ask user: (a) use server version, (b) keep local version, (c) merge — write the local file with git-style conflict markers (`<<<<<<< local`, `=======`, `>>>>>>> server`) and tell the user to resolve manually, then wait for confirmation before continuing
   - No base, no local, exists on server → new on server, write to local, note in summary
   - No base, no server match, exists locally → new locally, keep, note in summary

4. **Review logs**: Show any new log entries since last infil (compare count or timestamps).

5. **OPERATION.md update prompt**: If there are new logs or significant objective changes, ask user whether to update OPERATION.md with new context. When updating, append new log entries to the `## Timeline` section specifically.

6. **Update `.base/`**: After resolving all notes and objectives, overwrite `.base/` with the current server state — this resets the baseline for the next re-run.

7. **Print re-run summary**: Similar to fresh summary but focused on what changed (notes updated, conflicts resolved, new objectives, new logs). Use markdown link syntax for clickable paths.

## Rules

- On re-run, never silently overwrite local changes — always compare and let the user decide for diverged notes.
- Do NOT implement any code — only fetch and write local files.
- Do NOT elaborate or expand the plan — just capture current state.
- Objective notes from the server should be folded into OPERATION.md context, NOT written to OBJECTIVES.md (OBJECTIVES.md is a pure checklist).
