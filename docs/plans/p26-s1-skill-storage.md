# P26-S1: Skill Storage (DB + Service + API)

**Status: DONE**

## Goal

Add a `skills` table, service layer, and REST API for CRUD operations on project skills.

## What was shipped

### Task 1: Add `skills` schema

- [x] `src/server/db/schema/skills.ts` — table with `id`, `projectId`, `name`, `content`, `position`, `createdAt`, `updatedAt`. Relations to projects.
- [x] `src/server/db/schema/index.ts` — export skills
- [x] `src/server/db/schema/projects.ts` — add `skills: many(skills)` relation

### Task 2: Add skill service

- [x] `src/server/services/skill.ts` — `listSkills`, `getSkill`, `createSkill`, `updateSkill`, `deleteSkill`

### Task 3: Add skill API routes

- [x] `src/app/api/projects/[projectId]/skills/route.ts` — GET (list) + POST (create)
- [x] `src/app/api/projects/[projectId]/skills/[skillId]/route.ts` — PATCH + DELETE

## Notes

- Table name is `'skills'`, variable name is `skills` (not `projectSkills`)
- Schema file is `skills.ts` (not `project-skills.ts`)
- GET list uses `requireProjectWorker`, mutations use `requireAdminProjectWorker`
- `content` stores the full SKILL.md including frontmatter with description
- `position` auto-assigned on create (max + 1)
