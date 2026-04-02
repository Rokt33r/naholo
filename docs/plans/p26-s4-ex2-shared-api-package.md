# P26-S4-EX2: Shared API Package

## Goal

Create `packages/naholo-api` as the single source of truth for API response types and HTTP client. Today, types are duplicated across the web app hooks, CLI, and MCP server — with some mismatches (e.g., `completedTasks` is `number` in the service but `string | null` in hooks, `Skill` timestamps are `Date` in the service but `string` in hooks). The shared package eliminates this duplication and gives CLI/MCP type-safe API access.

## Prerequisites

- Existing service types in `src/server/services/*.ts` are the canonical definitions
- pnpm workspaces already configured (`pnpm-workspace.yaml`)
- CLI and MCP packages already exist under `packages/`

## Architecture Decisions

- **Types-only + client**: The package exports (1) API response types and (2) a typed HTTP client. No Zod schemas — request validation stays in the API routes.
- **JSON-serialized types**: API response types use `string` for dates (not `Date`), since JSON serialization converts `Date` to ISO strings. This matches what consumers actually receive over HTTP.
- **No build step for types**: Use TypeScript project references. Consumers import from source via `exports` field pointing to `./src/types.ts` and `./src/client.ts`.
- **Client is generic**: The client accepts `baseUrl` + `token` at construction time — no env-var coupling. CLI and MCP wrap it with their own config resolution.
- **Web app hooks import types only**: The frontend hooks import type definitions from `naholo-api` but keep using the relative-path `fetcher` for requests (since the web app calls its own origin, not an external URL).

## Tasks

### Task 1: Create the package scaffold

- [x] `packages/naholo-api/package.json` — Create with:
  ```json
  {
    "name": "naholo-api",
    "version": "0.1.0",
    "type": "module",
    "exports": {
      "./types": "./src/types.ts",
      "./client": "./src/client.ts"
    },
    "devDependencies": {
      "typescript": "^5"
    }
  }
  ```
- [x] `packages/naholo-api/tsconfig.json` — Create with standard ESM config: `target: "ES2022"`, `module: "Node16"`, `strict: true`, `outDir: "./dist"`, `rootDir: "./src"`

### Task 2: Define API response types

- [x] `packages/naholo-api/src/types.ts` — Define all API response types. These represent the JSON-serialized shapes that consumers receive over HTTP (dates as `string`, not `Date`):

  **Project types:**
  - `Project` — `{ id: string, name: string, description: string | null, createdAt: string }`
  - `ProjectWorkerInfo` — `{ id: string, type: string, name: string, role: string }`
  - `ProjectWithWorker` — `Project & { projectWorkerOfCurrentUser: ProjectWorkerInfo }`

  **Issue types:**
  - `Issue` — `{ id: string, projectId: string, title: string, closed: boolean, closedAt: string | null, createdAt: string, updatedAt: string }`
  - `IssueListItem` — `{ id: string, title: string, closed: boolean, closedAt: string | null, updatedAt: string, lastLogPreview: string | null, totalTasks: number, completedTasks: number }`
  - `IssueDetail` — `Pick<Issue, 'id' | 'projectId' | 'title' | 'closed' | 'closedAt' | 'createdAt' | 'updatedAt'>`

  **Task types:**
  - `Task` — `{ id: string, parentTaskId: string | null, name: string, note: string | null, done: boolean, position: number, createdAt: string, updatedAt: string }`
  - `CreateTaskInput` — `{ name: string, note?: string | null, parentTaskId?: string | null, position?: number }`
  - `UpdateTaskInput` — `{ name?: string, note?: string | null, done?: boolean }`
  - `MoveTaskInput` — `{ parentTaskId?: string | null, position: number }`

  **Note types:**
  - `Note` — `{ id: string, title: string, content: string, position: number, createdAt: string, updatedAt: string }`

  **Log types:**
  - `Log` — `{ id: string, content: string, projectWorker: { id: string, name: string, type: string } | null, createdAt: string, updatedAt: string }`

  **Skill types:**
  - `SkillSummary` — `{ id: string, name: string, position: number, currentRevisionId: string | null, createdAt: string, updatedAt: string }`
  - `Skill` — `SkillSummary & { content: string }`

  **Worker types:**
  - `Worker` — `{ id: string, projectId: string, userId: string | null, type: string, name: string, role: string, createdAt: string }`
  - `WorkerToken` — `{ id: string, name: string, tokenHint: string, lastUsedAt: string | null, createdAt: string }`
  - `CreateWorkerTokenResult` — `{ id: string, token: string }`

  **Auth types:**
  - `AuthUser` — `{ id: string, email: string, name: string }`
  - `UserApiToken` — `{ id: string, name: string, tokenHint: string, lastUsedAt: string | null, createdAt: string }`

### Task 3: Create the typed HTTP client

- [x] `packages/naholo-api/src/client.ts` — Create a `NaholoClient` class that wraps `fetch` with typed methods. Constructor takes `{ baseUrl: string, token: string }`. Pattern based on existing `packages/naholo-mcp/src/client.ts` but with proper return types:

  **Private helper:**
  - `request<T>(method, path, body?)` — same pattern as MCP client's `request()`, returns `Promise<T>`

  **Path builders (private):**
  - `projectPath(projectId, suffix?)` → `/api/projects/${projectId}${suffix}`
  - `issuePath(projectId, issueId, suffix?)` → `projectPath + /issues/${issueId}${suffix}`

  **Methods — all return typed promises using the types from `./types`:**
  - `getProject(projectId)` → `Promise<Project>`
  - `listProjects()` → `Promise<ProjectWithWorker[]>`
  - `updateProject(projectId, input)` → `Promise<Project>`
  - `listIssues(projectId, opts?: { closed?: boolean })` → `Promise<IssueListItem[]>`
  - `getIssue(projectId, issueId)` → `Promise<IssueDetail>`
  - `createIssue(projectId, input: { title: string })` → `Promise<Issue>`
  - `updateIssue(projectId, issueId, input: { title: string })` → `Promise<Issue>`
  - `deleteIssue(projectId, issueId)` → `Promise<void>`
  - `closeIssue(projectId, issueId)` → `Promise<void>`
  - `reopenIssue(projectId, issueId)` → `Promise<void>`
  - `listTasks(projectId, issueId)` → `Promise<Task[]>`
  - `createTask(projectId, issueId, input: CreateTaskInput)` → `Promise<Task>`
  - `updateTask(projectId, issueId, taskId, input: UpdateTaskInput)` → `Promise<Task>`
  - `deleteTask(projectId, issueId, taskId)` → `Promise<void>`
  - `moveTask(projectId, issueId, taskId, input: MoveTaskInput)` → `Promise<Task>`
  - `listNotes(projectId, issueId)` → `Promise<Note[]>`
  - `createNote(projectId, issueId, input: { title: string, content: string })` → `Promise<Note>`
  - `updateNote(projectId, issueId, noteId, input: { title?: string, content?: string })` → `Promise<Note>`
  - `deleteNote(projectId, issueId, noteId)` → `Promise<void>`
  - `listLogs(projectId, issueId)` → `Promise<Log[]>`
  - `createLog(projectId, issueId, input: { content: string })` → `Promise<Log>`
  - `deleteLog(projectId, issueId, logId)` → `Promise<void>`
  - `listSkills(projectId)` → `Promise<Skill[]>`
  - `createSkill(projectId, input: { name: string, content: string })` → `Promise<Skill>`
  - `updateSkill(projectId, skillId, input: { name?: string, content?: string })` → `Promise<Skill>`
  - `deleteSkill(projectId, skillId)` → `Promise<void>`
  - `listWorkers(projectId)` → `Promise<Worker[]>`
  - `getWorker(projectId, workerId)` → `Promise<Worker>`
  - `listWorkerTokens(projectId, workerId)` → `Promise<WorkerToken[]>`
  - `createWorkerToken(projectId, workerId, input: { name: string })` → `Promise<CreateWorkerTokenResult>`
  - `deleteWorkerToken(projectId, workerId, tokenId)` → `Promise<void>`
  - `getAuthUser()` → `Promise<AuthUser>`

### Task 4: Wire up pnpm workspace

- [x] `pnpm-workspace.yaml` — Add `packages` field if not present:
  ```yaml
  packages:
    - 'packages/*'
  ```

### Task 5: Migrate MCP server to use shared client

- [x] `packages/naholo-mcp/package.json` — Add dependency: `"naholo-api": "workspace:*"`
- [x] `packages/naholo-mcp/src/client.ts` — Replace entire file: re-export a pre-configured `NaholoClient` instance using env vars (`NAHOLO_URL`, `NAHOLO_TOKEN`). Keep `getConfig()` for the `NAHOLO_PROJECT_ID` env var (not part of the client). Export a `getClient()` function that lazily creates the client, and a `getProjectId()` for the project-scoped config.
- [x] `packages/naholo-mcp/src/index.ts` — Update imports: import types from `naholo-api/types`, use the new typed client. Remove inline `unknown` casts — the client methods now return typed results.

### Task 6: Migrate CLI to use shared client

- [x] `packages/naholo-cli/package.json` — Add dependency: `"naholo-api": "workspace:*"`
- [x] `packages/naholo-cli/src/commands/whoami.ts` — Import `NaholoClient` from `naholo-api/client` and `AuthUser` from `naholo-api/types`. Replace inline `fetch()` call with `client.getAuthUser()`. Remove the inline type assertion `as { id?: string; email?: string; name?: string }`.

### Task 7: Migrate web app hooks to use shared types

- [x] `src/hooks/use-projects.ts` — Remove local `Project`, `ProjectWorkerInfo`, `ProjectWithWorker` type definitions. Import them from `naholo-api/types`. Re-export for downstream component use.
- [x] `src/hooks/use-issues.ts` — Remove local `Issue`, `IssueListItem`, `IssueDetail` types. Import `IssueListItem` and `IssueDetail` from `naholo-api/types`. Re-export.
- [x] `src/hooks/use-tasks.ts` — Remove local `Task` type. Import from `naholo-api/types`. Re-export.
- [x] `src/hooks/use-notes.ts` — Remove local `Note` type. Import from `naholo-api/types`. Re-export.
- [x] `src/hooks/use-logs.ts` — Remove local `Log` type. Import from `naholo-api/types`. Re-export.
- [x] `src/hooks/use-skills.ts` — Remove local `Skill` type. Import from `naholo-api/types`. Re-export.
- [x] `src/hooks/use-workers.ts` — Remove local `Worker` type. Import from `naholo-api/types`. Re-export.
- [x] `src/hooks/use-worker-tokens.ts` — Remove local `WorkerToken` type. Import `WorkerToken` and `CreateWorkerTokenResult` from `naholo-api/types`. Re-export.
- [x] Root `package.json` — Add dependency: `"naholo-api": "workspace:*"`

### Task 8: Verify

- [x] Run `npx tsc` from the root to verify the web app compiles with the new type imports
- [x] Run `npx tsc` from `packages/naholo-mcp/` to verify MCP compiles
- [x] Run `npx tsc` from `packages/naholo-cli/` to verify CLI compiles

## Notes

- **Date serialization**: Service types use `Date` but JSON.stringify converts them to ISO strings. The shared types intentionally use `string` for date fields since that's what HTTP consumers receive. The service layer keeps its own `Date`-based types.
- **`completedTasks` mismatch**: The current `use-issues.ts` hook has `completedTasks: string | null` but the service returns `number`. Check the actual API response and use the correct type in the shared package (`number` is likely correct — the hook type is probably wrong).
- **No request validation schemas**: Zod schemas for request bodies stay in the API route handlers. The shared package only defines input types as plain TypeScript interfaces for the client methods.
- **Future**: Once the shared package exists, new API endpoints should define their types there first, then implement the route and client method.
