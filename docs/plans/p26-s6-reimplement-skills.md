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
  - `updateSkillSet(skillSetId: string, data: { name?: string; slug?: string }): Promise<ReturnResult<SkillSet>>` — returns `ConflictError` on duplicate slug
  - `deleteSkillSet(skillSetId: string): Promise<void>` — caller uses `requireSkillSetAccess` for not-found check

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

- [x] `packages/naholo-api/src/types.ts` — add `SkillSetSummary` type:
  ```ts
  type SkillSetSummary = {
    id: string
    name: string
    slug: string
    createdAt: string
    updatedAt: string
  }
  ```
- [x] `packages/naholo-api/src/client.ts` — add skill set methods and update skill methods:
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

- [x] `packages/naholo-cli/src/commands/skills.ts` — replace sub-commands: remove `sync`, `pull`, `push`, `get`. Add `install` and `upsert`.
- [x] Create `packages/naholo-cli/src/commands/skills-install.ts`:
  - Command: `naholo skills install`
  - Flow:
    1. Fetch skill sets via `client.listSkillSets(projectId)`
    2. If none, print "No skill sets found" and exit
    3. Show `@inquirer/select` prompt with skill sets listed as `{name} ({slug})`
    4. Fetch skills for selected set via `client.listSkills(projectId, slug)`
    5. For each skill, fetch full content via `client.getSkill(projectId, slug, skillName)`
    6. Write to `.claude/skills/{skillName}/SKILL.md` with the full content (not a stub)
    7. If file already exists, use `@inquirer/confirm` to ask "Overwrite {skillName}? (Y/n)" — default yes
    8. Per skill, print "Created: {skillName}" or "Overwritten: {skillName}" or "Skipped: {skillName}"
- [x] Create `packages/naholo-cli/src/commands/skills-upsert.ts`:
  - Command: `naholo skills upsert <skillSetSlug> <skillName> <skillPath>`
  - All three args required
  - Flow:
    1. Read file at `skillPath` (error if not found)
    2. Call `client.upsertSkill(projectId, skillSetSlug, { name: skillName, content: fileContent })`
    3. Print "Upserted skill '{skillName}' in skill set '{skillSetSlug}'"
- [x] Delete `packages/naholo-cli/src/commands/skills-get.ts`
- [x] Delete `packages/naholo-cli/src/commands/skills-pull.ts`
- [x] Delete `packages/naholo-cli/src/commands/skills-push.ts`
- [x] Delete `packages/naholo-cli/src/commands/skills-sync.ts`
- [x] Create `packages/naholo-cli/src/commands/skills-sets.ts`:
  - Subcommand group: `naholo skills sets`
  - `naholo skills sets create --name <name> --slug <slug>` — calls `client.createSkillSet(projectId, { name, slug })`
  - `naholo skills sets update <skillSetSlug> --name <name> --slug <slug>` — calls `client.updateSkillSet(projectId, slug, { name, slug })` (name and slug are optional but one should be provided at least.)
  - `naholo skills sets delete <skillSetSlug>` — calls `client.deleteSkillSet(projectId, slug)` with confirmation prompt

### Task 8: Simplify skill utilities

- [x] `packages/naholo-cli/src/skills.ts` — remove all pulled-skill machinery (interfaces `PulledSkillMeta`, `PulledSkill`; functions `readPulledSkill`, `writePulledSkill`, `backupPulledSkill`, `writeConflictMarkers`, `removePulledSkill`, `parsePulledSkill`, `getPulledSkillPath`, `getConflictedDir`). Remove `syncSkills` function and `getStubContent`. Keep only a simple `writeSkillFile(name: string, content: string): void` helper that writes to `.claude/skills/{name}/SKILL.md`.

### Task 9: Update `init` command

- [x] `packages/naholo-cli/src/commands/init.ts` — remove the `syncSkills()` call from both first-time and subsequent init flows. Skills are installed separately now.

### Task 10: Add skill set hooks

- [x] Create `src/hooks/use-skill-sets.ts` with:
  - `useSkillSets(projectId: string)` — query key `['skill-sets', projectId]`, fetches from `GET /api/projects/{projectId}/skill-sets`, staleTime 1 min
  - `useCreateSkillSet(projectId: string)` — POST to `/api/projects/{projectId}/skill-sets`, body `{ name, slug }`. Optimistic: append temp item. On settled: invalidate `['skill-sets', projectId]`.
  - `useUpdateSkillSet(projectId: string)` — PATCH to `/api/projects/{projectId}/skill-sets/{slug}`, body `{ name?, slug? }`. Optimistic: update in-place. On settled: invalidate `['skill-sets', projectId]`.
  - `useDeleteSkillSet(projectId: string)` — DELETE to `/api/projects/{projectId}/skill-sets/{slug}`. Optimistic: remove from list. On settled: invalidate `['skill-sets', projectId]` and `['skills', projectId]` (broad prefix to cover all skill set slugs).

### Task 11: Update skill hooks for skill sets

- [x] `src/hooks/use-skills.ts` — update all hooks to include `skillSetSlug` parameter. Replace `useCreateSkill`/`useUpdateSkill` with single `useUpsertSkill`:
  - `useSkills(projectId: string, skillSetSlug: string)` — query key `['skills', projectId, skillSetSlug]`, fetches from `GET /api/projects/{projectId}/skill-sets/{skillSetSlug}/skills`
  - `useUpsertSkill(projectId: string, skillSetSlug: string)` — PUT to `/api/projects/{projectId}/skill-sets/{skillSetSlug}/skills/{name}`, body `{ content }`. Optimistic: if skill with same name exists, update content; otherwise append new temp item. On settled: invalidate `['skills', projectId, skillSetSlug]`.
  - `useDeleteSkill(projectId: string, skillSetSlug: string)` — DELETE to `.../skills/{skillName}`. Optimistic: filter out. On settled: invalidate.
  - Remove `useCreateSkill` and `useUpdateSkill` exports.

### Task 12: Add skill-sets list page

- [x] Move `src/app/app/projects/[projectId]/skills/page.tsx` to `src/app/app/projects/[projectId]/skill-sets/page.tsx` and rewrite as a **skill-sets list page**.
  - Uses `useSkillSets(projectId)` to fetch skill sets
  - Each skill set renders as a clickable row: `{name} ({slug})` with `FolderOpen` icon (from lucide-react)
  - Clicking navigates to `/app/projects/${projectId}/skill-sets/${slug}` (same route prefix, just deeper)
  - Header has a "+" button that opens a create skill set dialog (inline or a small dialog component in the same file)
  - Create dialog: name + slug fields, calls `useCreateSkillSet`
  - Empty state: "No skill sets in this project"

Mockup:

```
┌─────────────────────────────────────┐
│ [ProjectSwitcher]             [+]   │
│                                     │
│ Skill Sets                          │
│                                     │
│ 📁 Core Skills (core-skills)        │
│ 📁 Templates (templates)            │
│ 📁 Onboarding (onboarding)          │
│                                     │
└─────────────────────────────────────┘
```

### Task 13: Add skill-set detail page (skill list)

- [x] Create `src/app/app/projects/[projectId]/skill-sets/[slug]/page.tsx`:
  - Fetches skill set info via `useSkillSets(projectId)` (find by slug from list) or a separate `useSkillSet(projectId, slug)` query
  - Lists skills in the set using `useSkills(projectId, slug)`
  - Each skill row: `{name}` with description parsed from frontmatter (reuse `parseFrontmatterDescription`), `Puzzle` icon
  - Clicking a skill navigates to `/app/projects/${projectId}/skill-sets/${slug}/skills/${skillName}`
  - Header: back arrow (navigates to `/app/projects/${projectId}/skill-sets`), skill set name, "+" button to create a skill
  - "+" button opens `SkillEditorDialog` in create mode
  - Empty state: "No skills in this skill set"

Mockup:

```
┌─────────────────────────────────────┐
│ [←] Core Skills               [+]  │
│                                     │
│ Skills                              │
│                                     │
│ 🧩 elaborate-plan                   │
│    Elaborate a plan document        │
│ 🧩 ship-plan                        │
│    Implement an elaborated plan     │
│ 🧩 review-pr                        │
│    Review a pull request            │
│                                     │
└─────────────────────────────────────┘
```

### Task 14: Add skill detail/editor page

- [x] Create `src/app/app/projects/[projectId]/skill-sets/[slug]/skills/[skillName]/page.tsx`:
  - Fetches the single skill via a query to `GET /api/projects/{projectId}/skill-sets/{slug}/skills/{skillName}`
  - Displays skill editor inline (not in a dialog): name field (read-only or editable) + content textarea
  - Save button calls `useUpsertSkill(projectId, slug)` with `{ name, content }`
  - Delete button with confirmation, calls `useDeleteSkill(projectId, slug)`, navigates back to skill set page on success
  - Header: back arrow (navigates to `/app/projects/${projectId}/skill-sets/${slug}`)

Mockup:

```
┌─────────────────────────────────────┐
│ [←] elaborate-plan     [Delete]     │
│                                     │
│ Name                                │
│ ┌─────────────────────────────────┐ │
│ │ elaborate-plan                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Content                             │
│ ┌─────────────────────────────────┐ │
│ │ ---                             │ │
│ │ description: Elaborate a plan   │ │
│ │ ---                             │ │
│ │                                 │ │
│ │ # Elaborate Plan                │ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
│                                     │
│                          [Save]     │
└─────────────────────────────────────┘
```

### Task 15: Update `SkillEditorDialog` for skill sets

- [x] `src/components/skills/skill-editor-dialog.tsx` — add `skillSetSlug` prop, use `useUpsertSkill(projectId, skillSetSlug)` for both create and edit. Remove `useCreateSkill`/`useUpdateSkill` usage. Update `useDeleteSkill(projectId, skillSetSlug)`. This dialog is now only used for creating new skills from the skill-set detail page (Task 13).

### Task 16: Update sidebar navigation

- [x] Update `src/components/app/app-mode-sidebar.tsx` — change the "skills" nav item to point to `/app/projects/${projectId}/skill-sets`. Update `isActive` check to match `currentMode === 'skill-sets'`.
- [x] Update `src/components/app/app-mode-menu.tsx` — same change for the mobile menu entry.

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

- The `position` column on `skills` has been dropped — skills are sorted by name.
- Existing data in the `skills` table has `projectId` but no `skillSetId`. The migration (written by user) will need to create a default skill set per project and reassign existing skills. Do NOT write the migration — just note this.
- Skill revisions are kept as-is — they still track content history per skill. The `upsert` service function creates revisions on update.
- No separate create/update for skills — upsert handles both. Simpler API surface.
