Fix permission check in all routes and services.

Any project workers can create/edit/delete any project entities(For project workers, only admin role can edit)

notes, logs, tasks routes should be improved.
these are bound to issues.

In routes or actions, permission check should be done before using manipulating methods of services.

- Routes: src/app/api/projects/[projectId]/\*\*/route.ts
- Actions: src/app/app/actions.ts
- Services: src/server/services/\*.ts

entities(Schema) bound to issue enitites:

- logs
- notes
- tasks

Add requireIssueAccess to server/auth/utils.ts which is wrapping requireProjectWorker and check the issue is of the project and return issue too.

```ts
function requireIssueAccess(
  projectId,
  issueId,
): Promise<{ projectWorker; issue }>
```

We need ones for logs, note and task too which are wrapping requireIssueAccess and verifying the entity actually belongs to projet and issue

```ts
function requireIssueLogAccess(
  projectId,
  issueId,
  logId,
): Promise<{ projectWorker; issue; log }>
```

Also want to make the service api to receive a single object argument so we can know what we should pass exactly.

# Example 1

Listing logs

## Current

The service is checking that ths issue belongs to a project.

src/server/services/log.ts

```ts
const [issue] = await db
  .select({ id: issues.id })
  .from(issues)
  .where(and(eq(issues.id, data.issueId), eq(issues.projectId, data.projectId)))
  .limit(1)

if (!issue) return err(new NotFoundError('Issue'))
```

src/app/app/actions.ts

```ts
const { projectWorker } = await requireProjectWorker(projectId)

const result = await createLog(projectWorker.id, {
  projectId,
  issueId,
  content,
})
```

## Expected

src/server/services/log.ts

No more issue fetching here.

src/app/app/actions.ts

```ts
const { projectWorker, issue } = await requireIssueAccess(projectId, issueId)

const result = await createLog({
  projectId,
  issueId,
  content,
  projectWorkerId: projectWorker.id,
})
```

# Example 2

Updating logs

## Expected

```ts
const { projectId, issueId, logId } = await context.params
const { projectWorker } = await requireIssueLogAccess(projectId, issueId)

// ... parsing and validating...

const result = await updateLog({
  projectWorkerId,
  projectId,
  issueId,
  logId,
  content,
})
```

src/server/services/log.ts

Remove the below since issue has been checked by requireIssueLogAccess

```ts
const [issue] = await db
  .select({ id: issues.id })
  .from(issues)
  .where(and(eq(issues.id, issueId), eq(issues.projectId, projectId)))
  .limit(1)

if (!issue) {
  return err(new NotFoundError('Issue'))
}
```
