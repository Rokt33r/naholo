# P26-S5: CLI Commands (init, sync-alias, pull, push, status)

## Goal

Implement the CLI commands for project initialization and skill management. The CLI reads user auth from `~/.naholo/` profiles and manages project-level config in `.naholo/`.

## Prerequisites

- p26-s1 (skill storage) — DONE
- p26-s3 (skill revisions) — needed for pull/push conflict detection
- p26-s4 (user auth + CLI login) — needed for authentication

## Architecture Decisions

- **Project config** (`.naholo/config.yml`): Stores `projectId` and `defaultWorkerId`. Checked into git.
- **Local config** (`.naholo/local/local-config.yml`): Stores `workerId` for the current user. Git-ignored via `.naholo/.gitignore`.
- **Skill alias map** (`.naholo/naholo-skill-alias-map.yml`): Maps skill names to IDs, tracks which `.claude/skills/` dirs are naholo-managed.
- **Pulled skills** (`.naholo/local/pulled-skills/{name}.md`): Local working copies of skills for editing. Frontmatter includes `revisionId`.
- **Skill stubs**: `naholo skills sync-alias` creates lightweight SKILL.md files that call `naholo skills get [name]` to fetch the actual content on-demand, rather than storing full content locally.

## Config Structure

### `.naholo/config.yml` (project config, committed)

```yaml
projectId: <uuid>
defaultWorkerId: <uuid> # optional, suggested worker
```

### `.naholo/local/local-config.yml` (local, git-ignored)

```yaml
workerId: <uuid>
```

### `.naholo/.gitignore`

```
local/
```

### `.naholo/naholo-skill-alias-map.yml`

```yaml
skills:
  elaborate-plan: <skill-id>
  push-plan: <skill-id>
```

## CLI Context

Introduce `getCliContext()` in `packages/naholo-cli/src/context.ts` to resolve all configs and build a unified context object used by all commands.

```ts
interface CliContext {
  globalConfig: GlobalConfig // from ~/.naholo/config.yml
  projectConfig: ProjectConfig // from .naholo/config.yml
  localConfig: LocalConfig // from .naholo/local/local-config.yml
  currentProfile: Profile // resolved auth profile from ~/.naholo/
  client: ApiClient // authenticated API client
}

async function getCliContext(): Promise<CliContext>
```

- Reads global config and resolves the current profile for auth
- Reads project config (`.naholo/config.yml`) — errors if missing (instruct to run `naholo init`)
- Reads local config (`.naholo/local/local-config.yml`) — errors if missing (instruct to run `naholo init`)
- Constructs an authenticated `ApiClient` from the current profile
- Commands that need context call `getCliContext()` at the start; `naholo init` builds context incrementally since configs don't exist yet

## Commands

### `naholo init`

**First time** (no `.naholo/config.yml`):

1. Read global profile (`~/.naholo/`) for auth
2. Fetch projects linked to the user (via their project worker memberships)
3. Prompt user to select a project
4. Ask which worker to use (own worker or bot workers, not other humans' workers). Default: own worker.
5. Ask to set selected worker as default worker for the project
6. Write `.naholo/config.yml` (projectId + defaultWorkerId)
7. Write `.naholo/local/local-config.yml` (workerId)
8. Write `.naholo/.gitignore` (ignore `local/`)
9. Run `sync-alias` automatically
10. Instruct to commit files in `.naholo/` so other contributors can get the same project config when pulling the commits.

**Subsequent init** (`.naholo/config.yml` exists):

- Only need to set up local config
- Show current local config if exists
- Fetch project workers, pre-select `defaultWorkerId` if still valid (warn if gone)
- Ask which worker to use
- Only ask to update `defaultWorkerId` if the current one is missing
- Write/update `.naholo/local/local-config.yml`
- Run `sync-alias`

### `naholo skills sync-alias`

1. Fetch skill list from `GET /api/projects/{projectId}/skills` (no content — just names + IDs)
2. Read existing alias map (`.naholo/naholo-skill-alias-map.yml`)
3. For each server skill:
   - If no local `.claude/skills/{name}/SKILL.md` conflict → create stub
   - If conflict with non-naholo skill → prompt: use alternative name (`{name}--naholo`) or replace existing
   - Update alias map
4. Remove stubs for skills that no longer exist on server (only naholo-managed ones per alias map)
5. Each stub SKILL.md instructs the agent to run `naholo skills get {name}` to fetch content. If the skill doesn't exist anymore, instruct to run `naholo skills sync-alias`. If the local pulled skill has `conflicted: true` in frontmatter, `naholo skills get` errors to prevent the agent from using a conflicted skill doc.

### `naholo skills pull [skill-name]`

1. Look up skill ID from alias map
2. Fetch skill with content + `revisionId` from server
3. If already pulled locally (`.naholo/local/pulled-skills/{name}.md`):
   - If frontmatter has `conflicted: true` → error, instruct user to resolve conflict and remove `conflicted: true` first
   - Compare local `revisionId` with server's
   - If same → no-op, already up to date
   - If different (conflict) → ask user if they want to resolve now:
     - If yes:
       - Move local to `.naholo/local/pulled-skills/conflicted/{name}-{iso8601}.md`
       - Fetch base revision + latest revision
       - Perform 3-way diff/merge into `.naholo/local/pulled-skills/{name}.md`
       - Set `conflicted: true` in frontmatter — user must review, resolve, and remove `conflicted: true` before pull/push works again
     - If no → abort, do nothing
4. If not pulled yet → write to `.naholo/local/pulled-skills/{name}.md` with `revisionId` in frontmatter

### `naholo skills push [skill-name]`

1. Read local pulled skill from `.naholo/local/pulled-skills/{name}.md`
2. If frontmatter has `conflicted: true` → error, instruct user to resolve conflict and remove `conflicted: true` first
3. Extract `revisionId` from frontmatter
4. Fetch current `revisionId` from server
5. If matching → push update via PATCH with `expectedRevisionId`, remove local copy
6. If conflict → ask user if they want to resolve now. If yes, trigger pull directly (skip the conflict confirmation and `conflicted: true` check since push already determined the state). If no, abort.

### `naholo status`

Show: project name, URL, worker info, number of synced skill aliases.

## Tasks

### Task 1: CLI package scaffolding

- [x] `packages/naholo-cli/package.json` — name `naholo-cli`, bin `naholo`, deps: `commander`, `@inquirer/prompts`, `yaml`
- [x] `packages/naholo-cli/tsconfig.json`
- [x] `packages/naholo-cli/src/cli.ts` — Commander setup with all commands (was already `cli.ts` not `index.ts`)
- [x] `packages/naholo-api/src/client.ts` — HTTP client using profile auth (lives in naholo-api package, added `getSkill` + `listSkills` returns `SkillSummary[]` + `updateSkill` accepts `expectedRevisionId`)
- [x] `packages/naholo-cli/src/context.ts` — `getCliContext()` resolving all configs, profile, and API client

### Task 2: `naholo init`

- [x] `packages/naholo-cli/src/commands/init.ts` — full init flow (first time + subsequent)
- [x] API: `GET /api/projects` endpoint — already existed
- [x] API: `GET /api/projects/[projectId]/workers` endpoint — already existed

### Task 3: `naholo skills sync-alias`

- [x] `packages/naholo-cli/src/commands/skills-sync-alias.ts` — sync alias flow with conflict handling
- [x] Stub SKILL.md template generation (inline in skills-sync-alias.ts)

### Task 4: `naholo skills pull` + `naholo skills push`

- [x] `packages/naholo-cli/src/commands/skills-pull.ts` — pull with conflict detection + conflict markers
- [x] `packages/naholo-cli/src/commands/skills-push.ts` — push with revision check
- [x] `packages/naholo-cli/src/commands/skills-get.ts` — fetch and display skill content (used by stubs)
- [x] `packages/naholo-cli/src/commands/skills.ts` — parent command grouping pull/push/get/sync-alias
- [x] `packages/naholo-cli/src/pulled-skill.ts` — shared helpers for reading/writing pulled skill files with frontmatter

### Task 5: `naholo status`

- [x] `packages/naholo-cli/src/commands/status.ts` — show config summary

## Notes

- Both CLI and MCP must read `.naholo/local/local-config.yml` for `workerId`. If missing, error asking to run `naholo init`.
- `defaultWorkerId` in project config is a suggestion, not enforced. Local config's `workerId` is what's actually used.
- Skill stubs are lightweight — the actual content is fetched on-demand via CLI, keeping local files small and always up-to-date.
