---
name: infil
description: Lock into a Naholo issue — fetch tasks, notes, and logs locally for offline-first workflow.
argument-hint: '{issueNumber}'
---

# Infil — Lock Into Issue

Fetch an issue's full context from Naholo and set up a local working directory for the `/spec` → `/ship` → `/exfil` workflow.

## Arguments

The argument is the issue number (e.g., `42`). Required.

## What to do

1. **Read issue context**: Use the MCP resource `naholo://issues/{issueNumber}` to fetch the full issue (tasks, notes, logs).

2. **Create local directory**: Create `.naholo/local/issues/{issueNumber}/notes/`.

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

4. **Write notes**: For each note on the issue, write its content to `.naholo/local/issues/{issueNumber}/notes/{name}.md`.

5. **Handle PLAN.md**:

   **If no PLAN note exists on the issue:**
   - Write a brief context document as `notes/PLAN.md` summarizing:
     - What the issue is about (from issue title + description)
     - Key decisions and events from logs (most recent first, highlight important ones)
     - Pointers to other notes (e.g., "See `api-design.md` for endpoint specs")
     - Relevant task notes inlined where useful
   - Do NOT elaborate or create an implementation plan — just summarize the current state so the user has enough context to start planning
   - Create the note on the server via `create_note` MCP tool with name `PLAN`

   **If a PLAN note already exists:**
   - Download it to `notes/PLAN.md` (already done in step 4)
   - Compare the PLAN content against the current logs and notes — look for gaps: new logs posted after the PLAN was last updated, new notes that aren't referenced, tasks that changed significantly
   - If there are no gaps → do nothing, just note "PLAN.md is up to date" in the summary
   - If there are gaps → summarize what new information exists (e.g., "3 new logs since PLAN was written, new note `research.md` not referenced") and **ask the user** whether to update PLAN.md with this new context. Only update if the user confirms.

6. **Print summary**: Output a summary like:

   ```
   Locked into issue #42: "Implement user auth"
   - Tasks: 12 (5 done, 7 remaining)
   - Notes: 3 (api-design, research, PLAN [created])
   - Logs: 8 entries
   - Local: .naholo/local/issues/42/
   ```

## Rules

- If `.naholo/local/issues/{issueNumber}/` already exists, warn the user and ask whether to overwrite or abort.
- Do NOT implement any code — only fetch and write local files.
- Do NOT elaborate or expand the plan — just capture current state.
- Task notes from the server should be folded into PLAN.md context, NOT written to TASKS.md (TASKS.md is a pure checklist).
