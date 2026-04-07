# P26-S5-EX1: Drop Skill Aliases — Simplify Push/Pull/Sync

## Goal

Replace the skill alias system (name→ID mapping in project config) with a simpler name-based design. Skills are identified by name (which must be unique per project), local skills are treated as pulled skills, and push resolves conflicts directly. This eliminates the `skillAliasRecord` in project config and the separate alias map concept entirely.

## Prerequisites

- [x] P26-S5: CLI Commands (init, sync-alias, pull, push, status) — DONE

## Architecture Decisions

- **Name as identifier**: Skills are looked up by name on the server, not by ID. The CLI never stores or uses skill IDs locally.
- **No alias record**: `skillAliasRecord` in `.naholo/config.yml` is removed entirely.
- **Two distinct layers — stubs and pulled skills**:
  - **Stubs** (`.claude/skills/{name}/SKILL.md`): Ephemeral, agent-facing. `naholo skills sync` flushes all naholo-managed stubs and recreates them from the server skill list. Stubs instruct the agent to run `naholo skills get {name}`.
  - **Pulled skills** (`.naholo/local/skills/{name}.md`): User-editable working copies. Created by `naholo skills pull`. Pushed back by `naholo skills push`.
  - **`naholo skills get`** (called by stubs): Returns the local pulled version if it exists, otherwise fetches from the server. This way the agent always sees the user's in-progress edits.
- **Server API replaces ID with name**: Replace `[skillId]` route with `[skillName]`. All skill endpoints use name as the path param: `GET/PATCH/DELETE /api/projects/[projectId]/skills/[skillName]`.
- **Conflict resolution on push**: The 5-case matrix from the rough plan governs push behavior. See Task 4 for the full matrix.
- **`sync` replaces `sync-alias`**: Flush all naholo-managed stubs in `.claude/skills/`, then recreate from server skill list. No alias record needed.

## Current State (what gets changed)

### Files to modify

- `packages/naholo-cli/src/skills.ts` — remove `skillAliasRecord` helpers, update pulled skill meta (drop `skillId`, make `revisionId` optional)
- `packages/naholo-cli/src/commands/skills-pull.ts` — rewrite to use name-based lookup
- `packages/naholo-cli/src/commands/skills-push.ts` — rewrite with the 5-case conflict matrix
- `packages/naholo-cli/src/commands/skills-get.ts` — use name-based lookup
- `packages/naholo-cli/src/commands/skills-sync-alias.ts` — rename to `skills-sync.ts`, remove alias record logic
- `packages/naholo-cli/src/commands/skills.ts` — update subcommand registration
- `packages/naholo-cli/src/project-config.ts` — remove `skillAliasRecord` from `ProjectConfig`
- `packages/naholo-api/src/client.ts` — replace `getSkill(projectId, skillId)` with `getSkill(projectId, skillName)`, update `updateSkill`/`deleteSkill` similarly
- `src/server/services/skill.ts` — replace `getSkill`/`updateSkill`/`deleteSkill` to look up by name instead of ID
- `src/app/api/projects/[projectId]/skills/[skillName]/route.ts` — replace `[skillId]` route param with `[skillName]`

### Files to create

- `src/app/api/projects/[projectId]/skills/[skillName]/route.ts` (replaces `[skillId]` version)

### Files to delete

- `packages/naholo-cli/src/commands/skills-sync-alias.ts` (replaced by `skills-sync.ts`)
- `src/app/api/projects/[projectId]/skills/[skillId]/route.ts` (replaced by `[skillName]`)

## Tasks

### Task 1: Add unique constraint on skill name per project

- [x] `src/server/db/schema/skills.ts` — add a unique index on `(projectId, name)`:
  ```ts
  import { uniqueIndex } from 'drizzle-orm/pg-core'
  // inside pgTable or as a standalone index:
  // uniqueIndex('skills_project_id_name_unique').on(skills.projectId, skills.name)
  ```
  Use Drizzle's `.unique()` or `uniqueIndex` — match whatever pattern the codebase uses for composite constraints.
- [x] `src/server/services/skill.ts` — in `createSkill`, handle the unique violation (catch DB error, return a descriptive `ConflictError` like "A skill with this name already exists")

### Task 2: Replace `[skillId]` route with `[skillName]`

Switch the skill detail endpoints from ID-based to name-based. All three methods (GET, PATCH, DELETE) use skill name as the path param.

- [x] `src/server/services/skill.ts` — change `getSkill`, `updateSkill`, `deleteSkill` to look up by `(projectId, name)` instead of `(projectId, skillId)`:
  - `getSkill(projectId: string, name: string): Promise<Skill | null>` — query with `eq(t.projectId, projectId) AND eq(t.name, name)`
  - `updateSkill(projectId: string, name: string, data: ...)` — same where clause change
  - `deleteSkill(projectId: string, name: string)` — same where clause change
  - Keep `listSkills(projectId)` and `createSkill(projectId, data)` unchanged
- [x] Delete `src/app/api/projects/[projectId]/skills/[skillId]/route.ts`
- [x] Create `src/app/api/projects/[projectId]/skills/[skillName]/route.ts` — same handlers as the old `[skillId]` route but pass `skillName` (decoded from params) to service functions instead of `skillId`
- [x] `packages/naholo-api/src/client.ts` — update skill methods to use name in the URL path:
  - `getSkill(projectId, name)` → `GET /api/projects/{projectId}/skills/{encodeURIComponent(name)}`
  - `updateSkill(projectId, name, input)` → `PATCH /api/projects/{projectId}/skills/{encodeURIComponent(name)}`
  - `deleteSkill(projectId, name)` → `DELETE /api/projects/{projectId}/skills/{encodeURIComponent(name)}`
  - Remove `skillId` params from all three methods
- [x] Update any web app code that calls these endpoints with skill IDs (search for `getSkill`, `updateSkill`, `deleteSkill` in `src/hooks/` and `src/components/`)

### Task 3: Remove alias record from project config and skills module

- [x] `packages/naholo-cli/src/project-config.ts` — remove `skillAliasRecord` from `ProjectConfig` interface:
  ```ts
  interface ProjectConfig {
    projectId: string
    defaultWorkerId?: string
    // skillAliasRecord removed
  }
  ```
- [x] `packages/naholo-cli/src/skills.ts` — remove alias-related code:
  - Remove `readSkillAliasRecord()`, `writeSkillAliasRecord()`, `getAliasSkillContent()`, `syncSkillAliases()`
  - Keep all pulled skill code (`readPulledSkill`, `writePulledSkill`, `backupPulledSkill`, `writeConflictMarkers`, `removePulledSkill`, `getPulledSkillPath`, `getConflictedDir`, `parsePulledSkill`)
  - Update `PulledSkillMeta` — drop `skillId`, make `revisionId` optional (for new local skills that haven't been pushed yet):
    ```ts
    interface PulledSkillMeta {
      revisionId?: string // absent for brand-new local skills
      conflicted?: boolean
    }
    ```
  - Add a new `getStubContent(skillName: string): string` helper that returns the SKILL.md stub content (same template as current `getAliasSkillContent`, but without alias indirection)
  - Add a new `syncSkills(client, projectId): Promise<void>` that:
    1. Fetches `client.listSkills(projectId)` (summaries only)
    2. Flush: remove all naholo-managed stubs from `.claude/skills/` (a stub is naholo-managed if its `SKILL.md` contains `naholo skills get`)
    3. For each server skill, create `.claude/skills/{skill.name}/SKILL.md` stub
    4. If a non-naholo-managed `.claude/skills/{name}/SKILL.md` already exists, prompt user (rename or replace — same conflict flow as current `syncSkillAliases`)
    5. No alias record is written anywhere

### Task 4: Rewrite `sync-alias` → `sync` command

- [x] Create `packages/naholo-cli/src/commands/skills-sync.ts` — same structure as current `skills-sync-alias.ts` but calls the new `syncSkills()` from skills.ts
- [x] Delete `packages/naholo-cli/src/commands/skills-sync-alias.ts`
- [x] `packages/naholo-cli/src/commands/skills.ts` — replace `sync-alias` subcommand with `sync`:
  - Import `syncCommand` from `./skills-sync.js` instead of `syncAliasCommand` from `./skills-sync-alias.js`
- [x] `packages/naholo-cli/src/commands/init.ts` — update the auto-sync call at the end of init from `syncSkillAliases()` to the new `syncSkills()`

### Task 5: Rewrite `naholo skills push` with 5-case conflict matrix

The push command writes a local skill to the server. The local file is at `.naholo/local/skills/{name}.md`.

**Case matrix:**

| Local revisionId | Server skill exists?                            | Action                                                                                                                                            |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| absent           | No                                              | Create new server skill. Remove local file on success.                                                                                            |
| absent           | Yes, same content                               | No-op. Remove local file.                                                                                                                         |
| absent           | Yes, different content                          | Write conflict markers (local vs server). Do NOT update server. User resolves locally first.                                                      |
| present          | No                                              | Create new server skill (ignore stale revisionId). Remove local file on success.                                                                  |
| present          | Yes, matching revisionId                        | PATCH server with `expectedRevisionId`. Remove local file on success.                                                                             |
| present          | Yes, non-matching revisionId, same content      | No-op. Remove local file.                                                                                                                         |
| present          | Yes, non-matching revisionId, different content | 3-way conflict markers (original=revision content, local=current local, server=latest server). Do NOT update server. User resolves locally first. |

- [x] `packages/naholo-cli/src/commands/skills-push.ts` — rewrite the command:
  - Argument: `<skill-name>` (name of the local skill file, without `.md`)
  - Read local skill via `readPulledSkill(skillName)` — error if not found or if `conflicted: true`
  - Fetch server skill via `client.getSkill(projectId, skillName)` — returns `Skill | null`
  - Implement the 5-case matrix above:
    - **No revisionId, no server skill**: `client.createSkill(projectId, { name: skillName, content: local.content })`, then `removePulledSkill(skillName)`
    - **No revisionId, server exists, same content**: `removePulledSkill(skillName)`, print "already up to date"
    - **No revisionId, server exists, different content**: `writeConflictMarkers(skillName, local.content, serverSkill.content, serverSkill.currentRevisionId!)`, print conflict instructions
    - **Has revisionId, no server skill**: `client.createSkill(projectId, { name: skillName, content: local.content })`, then `removePulledSkill(skillName)`
    - **Has revisionId, server matches**: `client.updateSkill(projectId, skillName, { content: local.content, expectedRevisionId: local.meta.revisionId })`, then `removePulledSkill(skillName)`. Handle 409 race condition (re-fetch and conflict).
    - **Has revisionId, server doesn't match, same content**: `removePulledSkill(skillName)`, print "already up to date"
    - **Has revisionId, server doesn't match, different content**: For 3-way diff, we need the base revision content. Fetch it via `client.getSkillRevision()` (see Note below on whether this API exists). If not available, fall back to 2-way conflict markers (local vs server).
  - Update `writeConflictMarkers` signature — drop `skillId` param since we no longer store it:
    ```ts
    writeConflictMarkers(skillName: string, localContent: string, serverContent: string, serverRevisionId: string): void
    ```

### Task 6: Rewrite `naholo skills pull`

Pull downloads a skill from the server for local editing.

- [x] `packages/naholo-cli/src/commands/skills-pull.ts` — rewrite:
  - Argument: `<skill-name>`
  - Fetch server skill via `client.getSkill(projectId, skillName)` — error if not found (404)
  - Check local via `readPulledSkill(skillName)`:
    - If local exists and `conflicted: true` → error, instruct to resolve first
    - If local exists and `revisionId` matches server → no-op, already up to date
    - If local exists and `revisionId` doesn't match → conflict flow (backup + conflict markers), same as current behavior
    - If no local → write fresh with `writePulledSkill(skillName, { revisionId: serverSkill.currentRevisionId! }, serverSkill.content)`
  - No alias record lookups — just use the name directly

### Task 7: Rewrite `naholo skills get`

- [x] `packages/naholo-cli/src/commands/skills-get.ts` — rewrite:
  - Check local pulled skill via `readPulledSkill(skillName)`:
    - If exists and `conflicted: true` → error, instruct to resolve first
    - If exists and not conflicted → print `local.content` and exit (prefer local edits)
  - If no local pulled skill → fetch from server via `client.getSkill(projectId, skillName)`, print content
  - Remove alias record lookup

### Task 8: Update SKILL.md stub template

- [x] `packages/naholo-cli/src/skills.ts` — update stub content in `getStubContent()`:
  - The stub should instruct the agent to run `naholo skills get {skillName}` (same as current)
  - Remove any references to `sync-alias` in favor of `sync` in the fallback instructions

## Diagrams

### Push Flow (5-case matrix)

```
naholo skills push <name>
│
├─ Read local .naholo/local/skills/{name}.md
│  └─ Not found? → Error: "not pulled locally"
│  └─ conflicted: true? → Error: "resolve conflicts first"
│
├─ Fetch server GET /skills/{name}
│  └─ Returns Skill | null
│
├─ local.revisionId absent?
│  ├─ server == null → CREATE server skill, remove local
│  ├─ server != null, same content → remove local (no-op)
│  └─ server != null, diff content → write conflict markers
│
└─ local.revisionId present?
   ├─ server == null → CREATE server skill, remove local
   ├─ server.currentRevisionId == local.revisionId
   │  └─ PATCH server with expectedRevisionId, remove local
   ├─ server.currentRevisionId != local.revisionId, same content
   │  └─ remove local (no-op)
   └─ server.currentRevisionId != local.revisionId, diff content
      └─ write 3-way conflict markers (or 2-way fallback)
```

### Sync Flow

```
naholo skills sync
│
├─ Fetch server skill list (summaries only)
│
├─ Flush: scan .claude/skills/*/SKILL.md
│  └─ Contains "naholo skills get"? → remove entire dir
│
└─ For each server skill:
   ├─ .claude/skills/{name}/SKILL.md exists (non-naholo)?
   │  └─ Prompt: rename or replace
   └─ Create .claude/skills/{name}/SKILL.md stub
```

### Get Flow (called by stubs)

```
naholo skills get <name>
│
├─ Local .naholo/local/skills/{name}.md exists?
│  ├─ conflicted: true → Error
│  └─ Not conflicted → Print local content (prefer local edits)
│
└─ No local → Fetch from server by name, print content
```

## Notes

- **Name uniqueness**: Task 1 adds a unique constraint on `(projectId, name)`. The migration will be generated by the implementer — do NOT run `db:generate` or `db:migrate` (per CLAUDE.md).
- **3-way diff**: The "non-matching revisionId, different content" case ideally uses the base revision (the revision at `local.revisionId`) as the common ancestor. This requires a `GET /api/projects/{projectId}/skills/{skillId}/revisions/{revisionId}` endpoint (or similar) that doesn't exist yet. For the initial implementation, fall back to 2-way conflict markers (local vs server) — same as the current behavior. A follow-up can add revision content fetching.
- **"Same content" comparison**: Compare `local.content.trim()` with `serverSkill.content.trim()` to avoid whitespace-only diffs causing unnecessary conflicts.
- **Detecting naholo-managed stubs**: Instead of an alias record, the `sync` command checks if `SKILL.md` contains the string `naholo skills get` to determine if a skill dir was created by naholo. This is a simple heuristic that avoids needing persistent state.
- **Web app impact**: The web app's skill UI (hooks, components) currently uses skill IDs in API calls. Task 2 includes updating those call sites to use skill names instead.
- **Local pulled skill path**: `.naholo/local/skills/{name}.md` (current `PULLED_SKILLS_DIR` constant — unchanged).
