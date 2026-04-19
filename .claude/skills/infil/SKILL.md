---
name: infil
description: Infil a Naholo issue — fetch tasks, notes, and logs locally for offline-first workflow.
argument-hint: '{issueNumber}'
model: sonnet
---

# Infil — Infil Issue

Fetch an issue's full context from Naholo and set up a local working directory for the `/spec` → `/ship` → `/sitrep` (mid-session) → `/exfil` (done) workflow. Use `/sitrep` between `/ship` sessions to sync progress without closing.

## Arguments

The argument is the issue number (e.g., `42`). Required.

## What to do

0. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

1. **Read issue context**: Use the MCP resource `naholo://issues/{issueNumber}` to fetch the full issue (tasks, notes, logs).

2. **Create local directory**: Create `.naholo/local/issues/{issueNumber}/notes/` and `.naholo/local/issues/{issueNumber}/.base/notes/`.

3. **Write TASKS.md**: Convert the issue's tasks into a markdown checkbox file at `.naholo/local/issues/{issueNumber}/TASKS.md`.

   Format:

   ```markdown
   # Tasks — Issue #{issueNumber}

   - [ ] Task name [ref](naholo://tasks/{taskId})
     - [x] Done subtask [ref](naholo://tasks/{taskId})
     - [ ] Pending subtask [ref](naholo://tasks/{taskId})
   ```

   - Preserve hierarchy via 2-space indentation per depth level
   - Use `- [x]` for tasks with `done: true`, `- [ ]` otherwise
   - Append ` [ref](naholo://tasks/{taskId})` to each line for server linkage
   - Order by `position` within each level
   - Also write a copy to `.naholo/local/issues/{issueNumber}/.base/TASKS.md` — this is the baseline snapshot for future re-run diffs.

4. **Write notes**: For each note on the issue, write its content to `.naholo/local/issues/{issueNumber}/notes/{name}.md`. Also write a copy to `.naholo/local/issues/{issueNumber}/.base/notes/{name}.md` — this is the baseline snapshot for future re-run diffs.

5. **Handle PLAN.md**:

   PLAN.md is always the evolving context document — it is never the spec.

   **If no PLAN note exists on the issue:**
   - Write `notes/PLAN.md` using this structured template:

     ```markdown
     # PLAN — Issue #{issueNumber}: {issue title}

     ## Pain

     What's wrong or missing. ≤3 sentences extracted from issue title + logs.
     If not explicitly stated, agent provides assumption marked with "_Agent-generated assumption:_".

     ## Resolution

     How we plan to fix it. ≤3 sentences extracted from issue title + logs.
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

   - **Pain**: extract from issue title, description, and logs. Keep brief — details go in SPEC.
   - **Resolution**: extract from logs. Keep brief — details go in SPEC.
   - **Open questions**: generate questions that would help the agent during `/spec` — the number should scale with the amount of context available. Each question gets its own `###` heading with `Answer -> ` on the next line so the user can fill in answers directly in the editor.
   - **Timeline**: chronological summary of all log entries with timestamps and author names. One bullet per log entry.
   - If other notes exist on the issue, add pointers (e.g., "See `api-design.md` for endpoint specs") in the Pain or Resolution sections where relevant. Fold relevant task notes into Pain/Resolution context.
   - Do NOT elaborate or create an implementation plan — just capture current state.
   - Create the note on the server via `create_note` MCP tool with name `PLAN`

   **If a PLAN note already exists:**
   - Download it to `notes/PLAN.md` (already done in step 4)
   - Verify the structured sections exist: `## Pain`, `## Resolution`, `## Open questions`, `## Timeline`. If PLAN.md uses the old free-form format (no structured sections), migrate it to the new template automatically and note this in the summary.
   - Compare the PLAN content against the current logs and notes — look for gaps: new logs posted after the PLAN was last updated (compare against the last Timeline entry), new notes that aren't referenced, tasks that changed significantly
   - If there are no gaps → do nothing, just note "PLAN.md is up to date" in the summary
   - If there are gaps → summarize what new information exists (e.g., "3 new logs since PLAN was written, new note `research.md` not referenced") and **ask the user** whether to update PLAN.md with this new context. When updating, append new log entries to the `## Timeline` section. Only update if the user confirms.

6. **Handle SPEC.md**: If a SPEC note exists on the server, it is downloaded like any other note in step 4. No special handling is needed — SPEC.md is treated as a regular note file. On re-run, apply the same 3-way merge logic as other notes.

7. **Print summary**: Output a summary using markdown link syntax for clickable paths:

   ```
   Infiled issue #42: "Implement user auth"
   - Tasks: 12 (5 done, 7 remaining)
   - Notes: 3 (api-design, research, PLAN [created])
   - Logs: 8 entries
   - Local: [.naholo/local/issues/42/](.naholo/local/issues/42/)
   - Plan: [PLAN.md](.naholo/local/issues/42/notes/PLAN.md)
   - Spec: [SPEC.md](.naholo/local/issues/42/notes/SPEC.md) (if exists)
   ```

## Re-run behavior (local dir exists)

If `.naholo/local/issues/{issueNumber}/` already exists, do NOT ask "overwrite or abort." Instead, compare and resolve:

1. **Fetch server state**: Use MCP resource `naholo://issues/{issueNumber}` to get current tasks, notes, and logs (same as fresh infil).

2. **Compare tasks**: Diff local `TASKS.md` against `.base/TASKS.md` (local changes) and server tasks (server changes).
   - Show summary: new tasks on server, tasks completed on server, tasks with changed names.
   - Update `TASKS.md` to reflect server state while preserving local `[x]` marks for tasks done locally but not yet synced.

3. **Compare notes**: For each note, 3-way diff using `.base/notes/{name}.md` as the common ancestor:
   - base == local == server → unchanged, skip
   - base == local, server differs → only server changed, update local silently
   - base == server, local differs → only local changed, keep local, note in summary
   - base != local AND base != server → both sides changed, ask user: (a) use server version, (b) keep local version, (c) merge — write the local file with git-style conflict markers (`<<<<<<< local`, `=======`, `>>>>>>> server`) and tell the user to resolve manually, then wait for confirmation before continuing
   - No base, no local, exists on server → new on server, write to local, note in summary
   - No base, no server match, exists locally → new locally, keep, note in summary

4. **Review logs**: Show any new log entries since last infil (compare count or timestamps).

5. **PLAN.md update prompt**: If there are new logs or significant task changes, ask user whether to update PLAN.md with new context. When updating, append new log entries to the `## Timeline` section specifically.

6. **Update `.base/`**: After resolving all notes and tasks, overwrite `.base/` with the current server state — this resets the baseline for the next re-run.

7. **Print re-run summary**: Similar to fresh summary but focused on what changed (notes updated, conflicts resolved, new tasks, new logs). Use markdown link syntax for clickable paths.

## Rules

- On re-run, never silently overwrite local changes — always compare and let the user decide for diverged notes.
- Do NOT implement any code — only fetch and write local files.
- Do NOT elaborate or expand the plan — just capture current state.
- Task notes from the server should be folded into PLAN.md context, NOT written to TASKS.md (TASKS.md is a pure checklist).
