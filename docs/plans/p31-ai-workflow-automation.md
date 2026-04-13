# P31 — Issue Lock-In Workflow (`/infil` + `/exfil`)

Replace the `docs/plans/` based workflow with a generic, local-first issue lock-in model. Any project using Naholo can adopt this workflow without creating special directories — all local state lives in `.naholo/local/` (already gitignored).

## Workflow

```
/infil 42        Lock into issue #42. Fetch tasks + notes locally.
                 Create PLAN.md if it doesn't exist (summarize logs + notes).

  ... user edits PLAN.md, adds context, refines ...

/spec            Elaborate PLAN.md into executable spec. Update TASKS.md.

  ... user reviews elaborated plan ...

/ship            Execute plan. Update TASKS.md checkboxes + PLAN.md as work progresses.

  ... work done (or paused/aborted) ...

/exfil           Sync changes back to Naholo. Post summary log. Optionally close.
/exfil "close, nice work"   — with extra instructions
```

## Local File Structure

```
.naholo/local/issues/{issueNumber}/
├── TASKS.md                    # Task tree as markdown checkboxes
└── notes/
    ├── PLAN.md                 # Auto-created on infil if missing
    ├── api-design.md           # Synced from Naholo note (name = filename)
    └── research.md             # etc.
```

### TASKS.md Format

```markdown
# Tasks — Issue #42

- [ ] Set up database schema [ref](naholo://tasks/{taskId})
  - [ ] Create users table [ref](naholo://tasks/{taskId})
  - [ ] Create sessions table [ref](naholo://tasks/{taskId})
- [x] Design API endpoints [ref](naholo://tasks/{taskId})
```

- Hierarchy via indentation (matches Naholo task nesting)
- `[ref](naholo://tasks/{taskId})` links each line to its server-side task
- New tasks added locally (no `[ref]`) get created on exfil
- Tasks checked off locally get synced as `done: true` on exfil
- **No task notes** — TASKS.md is a pure checklist. Task notes from the server are folded into PLAN.md context during `/infil`.

### Notes

- Each note is a markdown file in `notes/`
- Filename = note `name` field (see Task 1 below)
- PLAN.md is a regular note — synced to Naholo like any other

## Current State

| Capability                  | Status                                                            |
| --------------------------- | ----------------------------------------------------------------- |
| Notes CRUD (HTTP API)       | Working                                                           |
| Notes via MCP               | **Missing** — need `create_note`, `update_note`                   |
| Note `name` field           | **Missing** — notes only have `title`, need filenamifiable `name` |
| Task CRUD via MCP           | Working                                                           |
| Log create via MCP          | Working                                                           |
| Close issue via MCP         | Working                                                           |
| `.naholo/local/` gitignored | Working                                                           |

## Tasks

### Task 1: Replace `title` with `name` on notes

Notes currently have `title` as display name. Replace it with `name` — a single field that serves as display name, slug, URL identifier, and local filename. No separate title.

**Schema migration** (3-step: add nullable → backfill → tighten):

- [ ] 1.1 Add `name` column to `notes` table in `src/server/db/schema/` as **nullable** initially
  - `name: text('name')` — the note's identifier (used in tabs, URLs, filenames)
  - Column must be nullable at first because existing rows have no value
- [ ] 1.2 Write migration to backfill `name` from existing `title` values
  - Filenamify: lowercase, replace spaces/special chars with hyphens, collapse consecutive hyphens, trim
  - Handle duplicates within same issue: append `-2`, `-3`, etc. if collision
- [ ] 1.3 Tighten the column: add NOT NULL constraint and unique constraint `(issueId, name)`
  - This is a separate migration step that depends on 1.2 being fully applied
  - This step must not edit the migration file. Edit the schema file and let user run `db:generate` to create a new sql script for the constraint.

**Drop `title`**:

- [ ] 1.4 Remove `title` column from schema (or mark deprecated — depends on migration comfort)
  - All reads/writes switch to `name`
  - Edit schema, let user run `db:generate`

**Service + API**:

- [ ] 1.5 Update note service (`src/server/services/note.ts`)
  - `createNote`: accept `name` param (required), remove `title`
  - `updateNote`: accept optional `name` for rename
  - Add `findNoteByName(issueId, name)` for lookup
  - Add rename validation: new name must be unique within issue
- [ ] 1.6 Update note API routes
  - POST: `{ name: string, content: string }` — no more `title`
  - PATCH: `{ name?: string, content?: string }`
  - GET returns `name` instead of `title`
  - Change note URL addressing from ID to name where applicable

**Frontend — tabs, rename, navigation**:

- [ ] 1.7 Update tab display (`src/components/issues/issue-tabs.tsx`)
  - Tabs show `name` instead of `title`
  - Change URL format from `?tab=note:{noteId}` to `?tab=note:{name}`
  - "Add Note" creates with name `"untitled"` (or `"untitled-2"` etc. if collision)
- [ ] 1.8 Remove inline title input from `src/components/notes/note-view.tsx`
  - The editable title at the top of the note editor goes away
- [ ] 1.9 Add right-click context menu on note tab items
  - Use Radix `ContextMenu` on each tab button
  - Menu item: "Rename" — opens a rename dialog
- [ ] 1.10 Create rename dialog
  - Text input pre-filled with current `name`
  - On confirm: call PATCH with new `name`, then navigate to `?tab=note:{newName}` if this note is currently selected
  - Validate: non-empty, unique within issue
- [ ] 1.11 Update `packages/naholo-api/src/types.ts` — replace `title` with `name` on Note type
- [ ] 1.12 Update `src/hooks/use-notes.ts` — update mutations to use `name` instead of `title`

### Task 2: Add note MCP tools

- [ ] 2.1 Add `Note` type to `packages/naholo-api/src/types.ts` if not already present
- [ ] 2.2 Add `NaholoClient.createNote()` in `packages/naholo-api/src/client.ts`
  - `createNote(projectSlug, issueNumber, { name, content }): Promise<Note>`
- [ ] 2.3 Add `NaholoClient.updateNote()`
  - `updateNote(projectSlug, issueNumber, noteId, { name?, content? }): Promise<Note>`
- [ ] 2.4 Add `create_note` MCP tool in `packages/naholo-cli/src/mcp/tools.ts`
  - Input: `{ issueNumber, name, content }`
  - Returns: Note object
- [ ] 2.5 Add `update_note` MCP tool
  - Input: `{ issueNumber, noteId, name?, content? }`
  - Returns: `'Note updated.'`

### Task 3: Create `/infil` skill

Skill file: `.claude/skills/infil/SKILL.md`

Argument: `{issueNumber}`

Behavior:

- [ ] 3.1 Write skill that does the following:
  1. **Read issue context** via MCP resource `naholo://issues/{issueNumber}`
  2. **Create local directory**: `.naholo/local/issues/{issueNumber}/notes/`
  3. **Write TASKS.md**: Convert issue tasks to markdown checkbox format with `[ref]` links. Preserve hierarchy via indentation.
  4. **Write notes**: For each note on the issue, write `notes/{name}.md` with the note content
  5. **Create PLAN.md if missing**: If no note named `PLAN` exists on the issue:
     - Summarize the issue's logs, notes, and task notes into a brief context document
     - Structure: what the issue is about, key decisions from logs, pointers to other notes, relevant task notes inlined where useful
     - Do NOT elaborate — just give the user enough context to understand the state
     - Write locally as `notes/PLAN.md`
     - Create on server via `create_note` MCP tool (name: "PLAN")
  6. **Print summary**: Show what was fetched (task count, note list, whether PLAN.md was created)

### Task 4: Create `/spec` skill

Skill file: `.claude/skills/spec/SKILL.md`

Argument: optional extra instructions in quotes

Behavior:

- [ ] 4.1 Write skill that does the following:
  1. **Find locked issue**: Look for `.naholo/local/issues/*/` — if multiple, ask user which one. If none, tell user to run `/infil` first.
  2. **Read local state**: Read `TASKS.md` and all notes (especially `PLAN.md`)
  3. **Research codebase**: Investigate the codebase thoroughly (same approach as existing `/elaborate-plan`)
  4. **Elaborate PLAN.md**: Rewrite `notes/PLAN.md` into an executable spec with:
     - Goal, prerequisites, architecture decisions
     - Numbered tasks with subtasks, exact file paths, implementation details
     - Same quality bar as `/elaborate-plan`: "Could another session implement this by reading ONLY PLAN.md and CLAUDE.md?"
  5. **Update TASKS.md**: Sync task structure from the elaborated plan back to TASKS.md
     - New tasks get no `[ref]` (will be created on exfil)
     - Existing tasks keep their `[ref]` links
  6. **Update PLAN.md on server**: via `update_note` MCP tool
  7. **Do NOT implement any code** — only update plan docs and tasks

### Task 5: Create `/ship` skill

Skill file: `.claude/skills/ship/SKILL.md`

Argument: optional extra instructions (e.g., task range `"Task 1 ~ Task 3"`)

Behavior:

- [ ] 5.1 Write skill that does the following:
  1. **Find locked issue**: Same as `/elaborate`
  2. **Read plan**: Read `notes/PLAN.md` — must be elaborated (has tasks with checkboxes). If not, tell user to run `/spec` first.
  3. **Read TASKS.md**: Know current completion state
  4. **Implement tasks in order**: For each unchecked task in PLAN.md, top to bottom:
     - Implement the code changes described
     - Mark `- [x]` in PLAN.md immediately after completing
     - Update corresponding line in TASKS.md to `- [x]`
  5. **Verify as you go**: After each top-level task, run formatter + type check
  6. **Post progress logs**: After completing each top-level task, post a brief log via `create_log` MCP tool
  7. **Follow the plan strictly**: Same rules as existing `/ship-plan`

### Task 6: Create `/exfil` skill

Skill file: `.claude/skills/exfil/SKILL.md`

Argument: optional extra instructions (e.g., `"close, nice work"`, `"don't close, pausing for review"`)

Behavior:

- [ ] 6.1 Write skill that does the following:
  1. **Find locked issue**: Same pattern
  2. **Read local state**: TASKS.md + all notes
  3. **Read server state**: via MCP resource `naholo://issues/{issueNumber}` (get current tasks/notes)
  4. **Sync tasks**:
     - Tasks with `[ref]` that are now `[x]` locally but not done on server → `update_task(done: true)`
     - Tasks with `[ref]` whose name changed → `update_task(name: newName)`
     - Tasks without `[ref]` (new) → `create_task`, then update TASKS.md with the new `[ref]`
  5. **Sync notes**:
     - For each `notes/*.md` file, compare content with server note (match by `name`)
     - If changed → `update_note`
     - If new (no server match) → `create_note`
  6. **Post summary log**: Generate a diff summary of what changed since infil:
     - Tasks completed / added / modified
     - Notes created / updated
     - Brief description of code changes (from git diff if available)
     - Post via `create_log`
  7. **Ask about closing**: Unless extra instructions specify, ask user if they want to close the issue
     - If yes → `close_issue`
  8. **Clean up**: Remove `.naholo/local/issues/{issueNumber}/` directory

## Implementation Notes

### TASKS.md parsing

Need a parser that can round-trip markdown checkboxes with refs:

```
- [ ] Task name [ref](naholo://tasks/abc-123)
  - [x] Subtask [ref](naholo://tasks/def-456)
  - [ ] New subtask without ref
```

Parse into: `{ name, done, taskId?, children[] }`

This parsing logic lives in the skills (agent interprets the markdown). No code needed — the agent reads/writes markdown directly.

### Note naming

`name` is the single identifier for a note. It's used as:

- Tab display text
- URL parameter: `?tab=note:{name}`
- Local filename: `notes/{name}.md`
- MCP identifier for matching on infil/exfil

Users set the name directly (no auto-generation from a separate title). On creation, defaults to `"untitled"` (with `-2`, `-3` dedup).

### MCP tool pattern

Follow existing pattern in `packages/naholo-cli/src/mcp/tools.ts`:

```typescript
server.tool(
  'create_note',
  'Create a note on an issue',
  {
    issueNumber: z.number(),
    name: z.string(),
    content: z.string(),
  },
  async ({ issueNumber, name, content }) => {
    const result = await client.createNote(projectSlug, issueNumber, {
      name,
      content,
    })
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  },
)
```

## Out of Scope

- `docs/plans/` migration (existing plans stay as-is, new work uses this workflow)
- Bidirectional real-time sync (this is snapshot-based: fetch on infil, push on exfil)
- Multiple locked issues simultaneously (could work but not designed for it)
- `delete_note` MCP tool
- Web UI changes for the lock-in workflow
