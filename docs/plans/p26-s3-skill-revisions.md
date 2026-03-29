# P26-S3: Skill Revisions

## Goal

Add a revision system to skills so the CLI can detect conflicts when pulling/pushing skill content. Each update to a skill creates a new revision, and the API exposes `revisionId` for conflict detection.

## Prerequisites

- p26-s1 (skill storage) — DONE

## Architecture Decisions

- **Revision tracking**: New `skill_revisions` table. Each skill update inserts a new revision row. The `skills` table gets a `currentRevisionId` FK pointing to the latest revision.
- **Conflict detection**: CLI stores `revisionId` in pulled skill frontmatter. On push, CLI compares its `revisionId` with the server's current — if they differ, it's a conflict.
- **API changes**: GET responses include `revisionId`. List endpoint excludes `content` (no need to bulk-download). GET single skill returns full content + `revisionId`.

## Data Model

### `skill_revisions` table

```
id            uuid        PK, default random
skill_id      uuid        FK → skills.id ON DELETE CASCADE, NOT NULL
content       text        NOT NULL (full SKILL.md content at this revision)
created_at    timestamp   NOT NULL, default now()
```

### `skills` table changes

- Add `current_revision_id` uuid FK → skill_revisions.id (nullable initially, set on create/update)

## API Changes

### `GET /api/projects/[projectId]/skills`

- **Remove `content` from response** — only return `{ id, name, position, revisionId, createdAt, updatedAt }`
- `revisionId` comes from `currentRevisionId`

### `GET /api/projects/[projectId]/skills/[skillId]`

- **New endpoint** — returns full skill with content: `{ id, name, content, position, revisionId, createdAt, updatedAt }`

### `POST /api/projects/[projectId]/skills`

- Create skill + first revision atomically
- Response includes `revisionId`

### `PATCH /api/projects/[projectId]/skills/[skillId]`

- When `content` changes, create new revision
- Accept optional `expectedRevisionId` for conflict detection — if provided and doesn't match current, return 409 Conflict
- Response includes new `revisionId`

## Tasks

### Task 1: Add skill revisions schema

- [x] `src/server/db/schema/skill-revisions.ts` — create table + relations
- [x] `src/server/db/schema/skills.ts` — add `currentRevisionId` column
- [x] `src/server/db/schema/index.ts` — export skill-revisions

### Task 2: Update skill service for revisions

- [x] `src/server/services/skill.ts` — update `createSkill` to create initial revision, `updateSkill` to create new revision when content changes, add `getSkill` returning `revisionId`
- [x] Update `listSkills` to exclude `content`, include `revisionId`

### Task 3: Update skill API routes

- [x] `src/app/api/projects/[projectId]/skills/route.ts` — update GET to exclude content, include revisionId
- [x] `src/app/api/projects/[projectId]/skills/[skillId]/route.ts` — add GET endpoint, update PATCH for conflict detection (409 on revision mismatch)

## Notes

- Revisions are append-only — no editing or deleting individual revisions
- Could add a revision history UI later, but not in scope here
- The `expectedRevisionId` on PATCH is optional — web UI doesn't need it, only CLI push uses it
