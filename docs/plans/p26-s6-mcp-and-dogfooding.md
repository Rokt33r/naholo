# P26-S6: MCP Config Updates & Dogfooding Skills

## Goal

Update naholo-mcp to read from the new config structure (`.naholo/config.yml` + personal config), add skill-related MCP tools, and write dogfooding skills for this repo.

## Prerequisites

- p26-s1 (skill storage) — DONE
- p26-s3 (skill revisions) — for revision-aware skill tools
- p26-s5 (CLI commands) — for config structure to be finalized

## Tasks

### Task 1: Update naholo-mcp config resolution

- [ ] `packages/naholo-mcp/src/client.ts` — update `getConfig()` to read:
  1. `.naholo/config.yml` for `projectId` + `defaultWorkerId`
  2. `.naholo/personal/personal-config.yml` for `workerId`
  3. `~/.naholo/` global profile for `baseUrl` + `token` (user auth)
  4. Fall back to env vars (`NAHOLO_URL`, `NAHOLO_TOKEN`, `NAHOLO_PROJECT_ID`) for CI
- [ ] `packages/naholo-mcp/package.json` — add `yaml` dependency
- [ ] Error if `workerId` is not configured (personal-config.yml missing) — instruct user to run `naholo init`

### Task 2: Add skill MCP tools

- [ ] `packages/naholo-mcp/src/client.ts` — add `listSkills()` and `getSkill(skillId)` API functions
- [ ] `packages/naholo-mcp/src/index.ts` — register MCP tools:
  - `list_skills` — list all skills for the project (no content)
  - `get_skill` — get a single skill by ID (full content + revisionId)

### Task 3: Write dogfooding skills

- [ ] `.claude/skills/naholo-elaborate/SKILL.md` — fetch issue context via MCP (`get_issue`, `get_tasks`, `get_notes`), write to `.naholo/issue-notes/{issueId}.md`, elaborate a plan
- [ ] `.claude/skills/naholo-push/SKILL.md` — upload elaborated plan as a note on the issue, create a log entry
- [ ] `.claude/skills/naholo-ship/SKILL.md` — execute elaborated plan, update tasks as completed, create log entries

## Notes

- MCP reads the same config files as CLI — no duplication of config
- Dogfooding skills assume `.naholo/config.yml` exists (set up via `naholo init`)
- These skills are checked into the repo; later they can be migrated into the DB as default project skills
