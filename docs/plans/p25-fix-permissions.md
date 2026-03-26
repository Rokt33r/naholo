# P25: Fix Permission Checks in Routes and Services

## Problem

Permission checks are inconsistent across the codebase:

1. **No issue-belongs-to-project validation at the route/action layer** — Routes call `requireProjectWorker(projectId)` but never verify that `issueId` belongs to `projectId`. A worker could manipulate entities of issues in other projects by guessing issueIds.
2. **Services duplicate ownership checks** — Services like `createLog`, `createNote`, `createTask` each independently verify issue→project ownership. This is scattered and easy to miss.
3. **No entity-belongs-to-issue validation** — When updating/deleting a specific log, note, or task, there's no check that the entity actually belongs to the claimed issue/project path.
4. **Inconsistent function signatures** — Services use positional args (`projectWorkerId, issueId, taskId, name`) instead of a single object param, making it unclear what's required.

## Design

### New Auth Utilities (`src/server/auth/utils.ts`)

Add layered access checkers that compose on top of `requireProjectWorker`:

```ts
// Verifies worker has project access AND issue belongs to project
export async function requireIssueAccess(
  projectId: string,
  issueId: string,
): Promise<{ projectWorker: ProjectWorker; issue: { id: string } }>

// Verifies all of the above AND log belongs to issue
export async function requireIssueLogAccess(
  projectId: string,
  issueId: string,
  logId: string,
): Promise<{
  projectWorker: ProjectWorker
  issue: { id: string }
  log: { id: string }
}>

// Verifies all of the above AND note belongs to issue
export async function requireIssueNoteAccess(
  projectId: string,
  issueId: string,
  noteId: string,
): Promise<{
  projectWorker: ProjectWorker
  issue: { id: string }
  note: { id: string }
}>

// Verifies all of the above AND task belongs to issue
export async function requireIssueTaskAccess(
  projectId: string,
  issueId: string,
  taskId: string,
): Promise<{
  projectWorker: ProjectWorker
  issue: { id: string }
  task: { id: string }
}>
```

Each function:

- Calls `requireProjectWorker(projectId)` (inherits bearer/session dual auth)
- Queries the entity from DB with `AND(id, parentId)` to verify ownership chain
- Throws `NotFoundError` (→ 404) if any link in the chain is broken

### Service Signature Refactor

Convert all service functions from positional args to single object arg:

```ts
// Before
export async function createLog(
  projectWorkerId: string,
  data: { projectId: string; issueId: string; content: string },
)
// After
export async function createLog(data: {
  projectWorkerId: string
  issueId: string
  content: string
})

// Before
export async function updateTask(
  projectWorkerId: string,
  issueId: string,
  taskId: string,
  name: string,
)
// After
export async function updateTask(data: {
  projectWorkerId: string
  issueId: string
  taskId: string
  name: string
})
```

### Remove Redundant Ownership Checks from Services

Once the auth layer guarantees ownership, remove these patterns from services:

```ts
// REMOVE from services — now guaranteed by requireIssueAccess / requireIssue*Access
const [issue] = await db
  .select({ id: issues.id })
  .from(issues)
  .where(and(eq(issues.id, issueId), eq(issues.projectId, projectId)))
  .limit(1)
if (!issue) return err(new NotFoundError('Issue'))
```

Services should trust that the auth layer has already verified the ownership chain. They only need to focus on business logic.

## Implementation Steps

### Step 1: Add new auth utilities

**File:** `src/server/auth/utils.ts`

Add `requireIssueAccess`, `requireIssueLogAccess`, `requireIssueNoteAccess`, `requireIssueTaskAccess`.

Each queries the DB via `db.query` to verify the ownership chain:

- `requireIssueAccess`: `db.query.issues.findFirst({ where: (t, { eq, and }) => and(eq(t.id, issueId), eq(t.projectId, projectId)) })`
- `requireIssueLogAccess`: calls `requireIssueAccess` + `db.query.logs.findFirst({ where: (t, { eq, and }) => and(eq(t.id, logId), eq(t.issueId, issueId)) })`
- `requireIssueNoteAccess`: calls `requireIssueAccess` + `db.query.notes.findFirst({ where: (t, { eq, and }) => and(eq(t.id, noteId), eq(t.issueId, issueId)) })`
- `requireIssueTaskAccess`: calls `requireIssueAccess` + `db.query.tasks.findFirst({ where: (t, { eq, and }) => and(eq(t.id, taskId), eq(t.issueId, issueId)) })`

### Step 2: Refactor log service + routes

**Files:**

- `src/server/services/log.ts`
- `src/app/api/projects/[projectId]/issues/[issueId]/logs/route.ts` (GET, POST)
- `src/app/api/projects/[projectId]/issues/[issueId]/logs/[logId]/route.ts` (PATCH, DELETE)
- `src/app/app/actions.ts` (createLogAction)

Changes:

- **Routes/actions:** Replace `requireProjectWorker` with `requireIssueAccess` (for list/create) or `requireIssueLogAccess` (for update/delete)
- **Service:** Convert to single object args, remove issue ownership checks
- `listLogs({ issueId })` — remove projectId param, the auth layer already verified issue→project
- `createLog({ projectWorkerId, issueId, content })` — remove projectId and issue lookup
- `updateLog({ projectWorkerId, logId, content })` — remove issue lookup
- `deleteLog({ projectWorkerId, logId })` — remove issue lookup

### Step 3: Refactor note service + routes

**Files:**

- `src/server/services/note.ts`
- `src/app/api/projects/[projectId]/issues/[issueId]/notes/route.ts` (GET, POST)
- `src/app/api/projects/[projectId]/issues/[issueId]/notes/[noteId]/route.ts` (PATCH, DELETE)

Changes:

- **Routes:** Replace `requireProjectWorker` with `requireIssueAccess` / `requireIssueNoteAccess`
- **Service:** Convert to single object args, remove issue ownership checks
- `listNotes({ issueId })` — already takes just issueId, keep as-is or wrap in object
- `createNote({ projectWorkerId, issueId, title, content })` — remove projectId and issue lookup
- `updateNote({ projectWorkerId, noteId, title, content })` — remove issue lookup
- `deleteNote({ projectWorkerId, noteId })` — remove issue lookup

### Step 4: Refactor task service + routes

**Files:**

- `src/server/services/task.ts`
- `src/app/api/projects/[projectId]/issues/[issueId]/tasks/route.ts` (GET, POST)
- `src/app/api/projects/[projectId]/issues/[issueId]/tasks/[taskId]/route.ts` (PATCH, DELETE)
- `src/app/api/projects/[projectId]/issues/[issueId]/tasks/[taskId]/move/route.ts` (POST)
- `src/app/app/actions.ts` (createTaskAction, updateTaskAction, setTaskDoneAction, deleteTaskAction)

Changes:

- **Routes/actions:** Replace `requireProjectWorker` with `requireIssueAccess` / `requireIssueTaskAccess`
- **Service:** Convert to single object args, remove issue ownership checks
- `listTasks({ issueId })` — remove projectWorkerId scoping (use issueId only, auth layer handles access)
- `createTask({ projectWorkerId, issueId, name, note?, parentTaskId?, position? })` — remove projectId and issue lookup
- `updateTask({ projectWorkerId, issueId, taskId, name })` — remove projectWorkerId scoping in WHERE (use taskId + issueId)
- `setTaskDone({ projectWorkerId, issueId, taskId, done })` — same
- `updateTaskNote({ projectWorkerId, issueId, taskId, note })` — same
- `deleteTask({ projectWorkerId, issueId, taskId })` — same
- `moveTask({ projectWorkerId, issueId, taskId, parentTaskId?, position })` — same

### Step 5: Refactor issue service + routes

**Files:**

- `src/server/services/issue.ts`
- `src/app/api/projects/[projectId]/issues/route.ts` (GET, POST)
- `src/app/api/projects/[projectId]/issues/[issueId]/route.ts` (GET, PATCH, DELETE)
- `src/app/api/projects/[projectId]/issues/[issueId]/close/route.ts` (POST, DELETE)
- `src/app/app/actions.ts` (createIssueAction)

Changes:

- **Routes for single-issue ops:** Replace `requireProjectWorker` with `requireIssueAccess`
- **Service:** Convert to single object args where not already
- Issue service already takes `projectWorkerId` as first param — consolidate into object args

### Step 6: Update hooks (React Query)

**Files:** `src/hooks/use-tasks.ts`, `src/hooks/use-logs.ts`, `src/hooks/use-notes.ts`, etc.

If any API call signatures changed (e.g., request body shape), update the fetch calls accordingly. Most changes should be backend-only, but verify that request bodies still match.

### Step 7: Type check

Run `npx tsc` to catch any type errors from the refactoring.

## Notes

- `projectWorkerId` scoping in services was doing double duty: both auth AND data scoping. After this refactor, auth is handled by the route layer, and services scope by entity IDs (issueId, taskId, etc.) which is more correct.
- The `projectWorkerId` param stays in mutation services (create/update/delete) because it's needed as the `createdBy`/`updatedBy` foreign key, not for auth.
- `listLogs` and `listNotes` currently don't filter by `projectWorkerId` at all — this is fine because all workers in a project should see all entities. The issue is only that we weren't verifying the issue belonged to the project.
