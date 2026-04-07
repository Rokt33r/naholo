# P26-S6: Reimplement Skills — Skill Sets + Install Model

## Goal

Replace the sync/push/pull skill workflow with a simpler "install" model inspired by shadcn. Introduce **skill sets** (groups of skills) so users can browse and install curated bundles. After install, skills are local files users edit freely; uploading changes back to the server is a separate, explicit `upsert` command. This removes all conflict resolution complexity (pull/push/conflict markers/revision tracking during sync).

## Prerequisites

- [x] P26-S1: Skill storage (skills table, service, API)
- [x] P26-S2: Skill UI (editor dialog, React Query hooks)
- [x] P26-S3: Skill revisions
- [x] P26-S4: User auth + CLI login
- [x] P26-S5: CLI commands (current sync/push/pull — will be replaced)

## Architecture Decisions

- **Skill sets** are a new grouping layer between project and skill. A project has many skill sets; a skill set has many skills. The existing `skills` table gains a `skillSetId` FK (replacing direct `projectId` ownership).
- **CLI `install` replaces `sync`/`pull`**: `naholo skills install` lets user pick a skill set, then writes each skill as a plain `.claude/skills/{name}/SKILL.md` file (full content, not a stub). If the file already exists, prompt per-skill to overwrite or skip.
- **CLI `upsert` replaces `push`**: `naholo skills upsert <skillSetSlug> <skillName> <filePath>` creates or updates a server skill and creates a new revision.
- **Remove pulled-skill machinery**: no more `.naholo/local/skills/`, no YAML frontmatter with `revisionId`/`conflicted`, no conflict markers, no backup files.
- **`init` no longer syncs skills** — users explicitly install when ready.
- Skill set slugs are `[a-z0-9-]+`, unique per project (used in CLI commands and URLs).
- Skill names remain `[a-z0-9-]+`, unique within a skill set (enforced by DB unique index).

## Tasks

### Task 1: Add `skill_sets` table and update `skills` table

**DB schema changes — do NOT run migrations, only edit schema files.**

- [x] Create `src/server/db/schema/skill-sets.ts`:
  - Table `skill_sets` with columns:
    - `id: uuid PK defaultRandom`
    - `projectId: uuid NOT NULL FK → projects.id (cascade delete)`
    - `name: text NOT NULL` (display name, e.g. "Core Skills")
    - `slug: text NOT NULL` (URL-safe identifier, e.g. "core-skills")
    - `createdAt: timestamp NOT NULL defaultNow`
    - `updatedAt: timestamp NOT NULL defaultNow`
  - Unique index on `(projectId, slug)` — name: `skill_sets_project_id_slug_unique`
  - Relations: `project` (one, FK projectId → projects.id), `skills` (many)
- [x] `src/server/db/schema/skills.ts` — add `skillSetId: uuid NOT NULL FK → skillSets.id (cascade delete)`. Remove the existing `projectId` FK (skills now belong to a project transitively through skill set). Update the unique index from `(projectId, name)` to `(skillSetId, name)` — name: `skills_skill_set_id_name_unique`. Update relations: replace `project` with `skillSet` (one, FK skillSetId → skillSets.id).
- [x] `src/server/db/schema/projects.ts` — add `skillSets` relation (many) to `projectsRelations`. Remove `skills` relation.
- [x] `src/server/db/schema/index.ts` — add `export * from './skill-sets'`

### Task 2: Add skill set service

- [x] Create `src/server/services/skill-set.ts` with:

  ```ts
  type SkillSetSummary = {
    id: string
    name: string
    slug: string
    createdAt: Date
    updatedAt: Date
  }
  type SkillSet = SkillSetSummary // same for now, extensible later
  ```

  Functions:
  - `listSkillSets(projectId: string): Promise<SkillSetSummary[]>` — ordered by `createdAt` asc
  - `getSkillSet(projectId: string, slug: string): Promise<SkillSet | null>` — find by `(projectId, slug)`
  - `createSkillSet(projectId: string, data: { name: string; slug: string }): Promise<ReturnResult<{ id: string }>>` — returns `ConflictError` if slug already exists (catch `skill_sets_project_id_slug_unique`)
  - `updateSkillSet(projectId: string, slug: string, data: { name?: string; slug?: string }): Promise<ReturnResult<SkillSet>>` — returns `NotFoundError` / `ConflictError`
  - `deleteSkillSet(projectId: string, slug: string): Promise<ReturnResult<undefined>>` — returns `NotFoundError` if not found

### Task 3: Update skill service for skill sets

- [x] `src/server/services/skill.ts` — change all functions to scope by `skillSetId` instead of `projectId`. Remove `createSkill` and `updateSkill` — upsert replaces both:
  - `listSkills(skillSetId: string): Promise<SkillSummary[]>`
  - `getSkill(skillSetId: string, name: string): Promise<Skill | null>`
  - `upsertSkill(skillSetId: string, data: { name: string; content: string }): Promise<ReturnResult<{ id: string; currentRevisionId: string }>>` — if skill exists, update content + create revision; if not, create skill + initial revision.
  - `deleteSkill(skillSetId: string, name: string): Promise<ReturnResult<undefined>>`

### Task 4: Add skill set API routes

- [x] Create `src/app/api/projects/[projectId]/skill-sets/route.ts`:
  - `GET` — list skill sets for project. Auth via `requireProjectWorker(projectId)`. Returns `SkillSetSummary[]`.
  - `POST` — create skill set. Body: `{ name: string, slug: string }` (both required, slug validated as `[a-z0-9-]+`). Returns `201` with `{ id }`. Returns `409` on duplicate slug.
- [x] Create `src/app/api/projects/[projectId]/skill-sets/[skillSetSlug]/route.ts`:
  - `GET` — get skill set by slug. Returns `SkillSet`.
  - `PATCH` — update skill set. Body: `{ name?: string, slug?: string }`. Returns updated `SkillSet`.
  - `DELETE` — delete skill set (cascades to skills). Returns `{ success: true }`.

### Task 5: Restructure skill API routes under skill sets

- [x] Create `src/app/api/projects/[projectId]/skill-sets/[skillSetSlug]/skills/route.ts`:
  - `GET` — list skills in skill set. Resolve skill set by `(projectId, slug)` to get `skillSetId`, then call `listSkills(skillSetId)`.
- [x] Create `src/app/api/projects/[projectId]/skill-sets/[skillSetSlug]/skills/[skillName]/route.ts`:
  - `GET` — get skill by name. Returns full `Skill` with content.
  - `PUT` — upsert skill. Body: `{ content: string }`. Skill name from route param. Calls `upsertSkill(skillSetId, { name: skillName, content })`. Returns `200` with `{ id, currentRevisionId }`.
  - `DELETE` — delete skill. Returns `{ success: true }`.
- [x] Remove old routes: `src/app/api/projects/[projectId]/skills/route.ts` and `src/app/api/projects/[projectId]/skills/[skillName]/route.ts`

### Task 6: Update API client (`naholo-api`)

- [ ] `packages/naholo-api/src/types.ts` — add `SkillSetSummary` type:
  ```ts
  type SkillSetSummary = {
    id: string
    name: string
    slug: string
    createdAt: string
    updatedAt: string
  }
  ```
- [ ] `packages/naholo-api/src/client.ts` — add skill set methods and update skill methods:
  - Add helper: `private skillSetPath(projectId: string, slug: string, suffix = '')` → `/api/projects/${projectId}/skill-sets/${encodeURIComponent(slug)}${suffix}`
  - `listSkillSets(projectId: string): Promise<SkillSetSummary[]>` — GET `.../skill-sets`
  - `getSkillSet(projectId: string, slug: string): Promise<SkillSetSummary>` — GET `.../skill-sets/{slug}`
  - `createSkillSet(projectId: string, input: { name: string; slug: string }): Promise<{ id: string }>` — POST `.../skill-sets`
  - `updateSkillSet(projectId: string, slug: string, input: { name?: string; slug?: string }): Promise<SkillSetSummary>` — PATCH `.../skill-sets/{slug}`
  - `deleteSkillSet(projectId: string, slug: string): Promise<void>` — DELETE `.../skill-sets/{slug}`
  - Update skill methods to take `(projectId, skillSetSlug, ...)` — upsert only, no separate create/update:
    - `listSkills(projectId: string, skillSetSlug: string)` — GET `.../skill-sets/{slug}/skills`
    - `getSkill(projectId: string, skillSetSlug: string, name: string)` — GET `.../skill-sets/{slug}/skills/{name}`
    - `upsertSkill(projectId: string, skillSetSlug: string, name: string, input: { content: string }): Promise<{ id: string; currentRevisionId: string }>` — PUT `.../skill-sets/{slug}/skills/{name}`
    - `deleteSkill(projectId: string, skillSetSlug: string, name: string)` — DELETE `.../skill-sets/{slug}/skills/{name}`

### Task 7: Rewrite CLI skill commands

- [ ] `packages/naholo-cli/src/commands/skills.ts` — replace sub-commands: remove `sync`, `pull`, `push`, `get`. Add `install` and `upsert`.
- [ ] Create `packages/naholo-cli/src/commands/skills-install.ts`:
  - Command: `naholo skills install`
  - Flow:
    1. Fetch skill sets via `client.listSkillSets(projectId)`
    2. If none, print "No skill sets found" and exit
    3. Show `@inquirer/select` prompt with skill sets listed as `{name} ({slug})`
    4. Fetch skills for selected set via `client.listSkills(projectId, slug)`
    5. For each skill, fetch full content via `client.getSkill(projectId, slug, skillName)`
    6. Write to `.claude/skills/{skillName}/SKILL.md` with the full content (not a stub)
    7. If file already exists, use `@inquirer/confirm` to ask "Overwrite {skillName}? (Y/n)" — default yes
    8. Print summary: "Installed N skills from {skillSetName}" // TODO: Instead of summary, print new or override per skill
- [ ] Create `packages/naholo-cli/src/commands/skills-upsert.ts`:
  - Command: `naholo skills upsert <skillSetSlug> <skillName> <skillPath>`
  - All three args required
  - Flow:
    1. Read file at `skillPath` (error if not found)
    2. Call `client.upsertSkill(projectId, skillSetSlug, { name: skillName, content: fileContent })`
    3. Print "Upserted skill '{skillName}' in skill set '{skillSetSlug}'"
- [ ] Delete `packages/naholo-cli/src/commands/skills-get.ts`
- [ ] Delete `packages/naholo-cli/src/commands/skills-pull.ts`
- [ ] Delete `packages/naholo-cli/src/commands/skills-push.ts`
- [ ] Delete `packages/naholo-cli/src/commands/skills-sync.ts`

// TODO: need commands for skill sets

- `naholo skills sets create --name [name] --slug [slug]`
- `naholo skills sets update [skilLSetSlug] --name [name] --slug [slug]`
- `naholo skills sets delete [skilLSetSlug]`

### Task 8: Simplify skill utilities

- [ ] `packages/naholo-cli/src/skills.ts` — remove all pulled-skill machinery (interfaces `PulledSkillMeta`, `PulledSkill`; functions `readPulledSkill`, `writePulledSkill`, `backupPulledSkill`, `writeConflictMarkers`, `removePulledSkill`, `parsePulledSkill`, `getPulledSkillPath`, `getConflictedDir`). Remove `syncSkills` function and `getStubContent`. Keep only a simple `writeSkillFile(name: string, content: string): void` helper that writes to `.claude/skills/{name}/SKILL.md`.

### Task 9: Update `init` command

- [ ] `packages/naholo-cli/src/commands/init.ts` — remove the `syncSkills()` call from both first-time and subsequent init flows. Skills are installed separately now.

### Task 10: Update skill UI hooks and components

- [ ] `src/hooks/use-skills.ts` — update all hooks to include `skillSetSlug` parameter. Replace `useCreateSkill`/`useUpdateSkill` with single `useUpsertSkill`:
  - `useSkills(projectId: string, skillSetSlug: string)` — query key `['skills', projectId, skillSetSlug]`
  - `useUpsertSkill(projectId: string, skillSetSlug: string)` — POST with optimistic update
  - `useDeleteSkill(projectId: string, skillSetSlug: string)`
  - Update all fetch URLs to route through `/skill-sets/{slug}/skills/...`
- [ ] Add `src/hooks/use-skill-sets.ts` with:
  - `useSkillSets(projectId: string)` — query key `['skill-sets', projectId]`, fetches from `GET /api/projects/{projectId}/skill-sets`
  - `useCreateSkillSet(projectId: string)` — POST with optimistic update
  - `useUpdateSkillSet(projectId: string)` — PATCH with optimistic update
  - `useDeleteSkillSet(projectId: string)` — DELETE with optimistic update, also invalidates `['skills', projectId, ...]`
- [ ] `src/components/skills/skill-editor-dialog.tsx` — add `skillSetSlug` prop, pass to skill mutation hooks
- [ ] Update the skills settings page to show a skill-set selector/tabs before listing skills (exact page path: `src/app/app/projects/[projectId]/skills/` — find and update the page component that renders `SkillEditorDialog` and skill list)

## Diagram: New Data Model

```
Project
  └─ SkillSet (name, slug — unique per project)
       └─ Skill (name — unique per skill set)
            └─ SkillRevision (content snapshot)
```

## Diagram: CLI Install Flow

```
naholo skills install
  │
  ├─ GET /skill-sets → list skill sets
  ├─ User picks one via @inquirer/select
  ├─ GET /skill-sets/{slug}/skills → list skills
  │
  └─ For each skill:
       ├─ GET /skill-sets/{slug}/skills/{name} → full content
       ├─ If .claude/skills/{name}/SKILL.md exists → confirm overwrite
       └─ Write .claude/skills/{name}/SKILL.md
```

## Notes

- The `position` column on `skills` can remain — still useful for ordering within a skill set.
- Existing data in the `skills` table has `projectId` but no `skillSetId`. The migration (written by user) will need to create a default skill set per project and reassign existing skills. Do NOT write the migration — just note this.
- Skill revisions are kept as-is — they still track content history per skill. The `upsert` service function creates revisions on update.
- No separate create/update for skills — upsert handles both. Simpler API surface.
