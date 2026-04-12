# P28: Reflect Last Log Preview & Task Counts in Issue List

## Goal

When a log is created/updated/deleted or tasks are created/toggled/deleted, the issue list should immediately reflect the updated `lastLogPreview` and `totalTasks`/`completedTasks` values via optimistic cache updates. Currently only the issue title propagates changes back to the list.

## Prerequisites

None — all required infrastructure (React Query hooks, issue list cache, optimistic update pattern) already exists.

## Architecture Decisions

- **Optimistic updates over invalidation-only**: Follow the same pattern used by `useUpdateIssueTitle` in `src/hooks/use-issues.ts:49-114` — update issue list cache in `onMutate`, invalidate in `onSettled` as safety net.
- **Helper function**: Extract a shared `updateIssueListCache` helper within each hook file to avoid repeating the `for (const filter of ['open', 'closed'])` + `setQueryData` boilerplate. The helper takes `queryClient`, `projectId`, `issueNumber`, and an updater function.
- **No new API endpoints**: The backend already updates `issues.lastLogPreview` and `issues.updatedAt` when logs change, and task counts are aggregated at query time. We only need client-side cache updates.

## Data Shape Reference

```typescript
// IssueListItem (packages/naholo-api/src/types.ts:34-44)
type IssueListItem = {
  id: string
  number: number
  title: string
  closed: boolean
  closedAt: string | null
  updatedAt: string
  lastLogPreview: string | null // first 100 chars of most recent log
  totalTasks: number
  completedTasks: number
}
```

## Query Keys Reference

- Issue list: `['issues', projectId, 'open']` and `['issues', projectId, 'closed']`
- Logs: `['logs', issueNumber]`
- Tasks: `['tasks', issueNumber]`

## Tasks

### Task 1: Update issue list cache on log mutations

Modify `src/hooks/use-logs.ts` — all three mutations (`useCreateLog`, `useUpdateLog`, `useDeleteLog`) need to update the issue list cache.

Each hook already receives `projectId` and `issueNumber` as parameters.

- [x] In `useCreateLog` `onMutate`: after updating logs cache, also update issue list cache for both `'open'` and `'closed'` filters:
  - Set `lastLogPreview` to `content.slice(0, 100)` (the new log is the most recent)
  - Set `updatedAt` to `new Date().toISOString()`
  - Pattern: `queryClient.setQueryData<IssueListItem[]>(['issues', projectId, filter], (old) => old?.map(issue => issue.number === issueNumber ? { ...issue, lastLogPreview: content.slice(0, 100), updatedAt: new Date().toISOString() } : issue))`
- [x] In `useCreateLog` `onError`: add `queryClient.invalidateQueries({ queryKey: ['issues', projectId] })` for rollback
- [x] In `useCreateLog` `onSettled`: add `queryClient.invalidateQueries({ queryKey: ['issues', projectId] })` to revalidate

- [x] In `useUpdateLog` `onMutate`: after updating logs cache, also update issue list cache:
  - Read current logs from cache to check if the updated log is the last one (highest index / most recent `createdAt`)
  - If the updated log is the last log, set `lastLogPreview` to `content.slice(0, 100)`
  - Set `updatedAt` to `new Date().toISOString()`
- [x] In `useUpdateLog` `onError`: add `queryClient.invalidateQueries({ queryKey: ['issues', projectId] })`
- [x] In `useUpdateLog` `onSettled`: add `queryClient.invalidateQueries({ queryKey: ['issues', projectId] })`

- [x] In `useDeleteLog` `onMutate`: after updating logs cache, also update issue list cache:
  - Read current logs from cache, filter out the deleted log, find the new last log
  - Set `lastLogPreview` to new last log's `content.slice(0, 100)` or `null` if no logs remain
  - Set `updatedAt` to `new Date().toISOString()`
- [x] In `useDeleteLog` `onError`: add `queryClient.invalidateQueries({ queryKey: ['issues', projectId] })`
- [x] In `useDeleteLog` `onSettled`: add `queryClient.invalidateQueries({ queryKey: ['issues', projectId] })`

Import `IssueListItem` from `naholo-api/types` at the top of the file.

### Task 2: Update issue list cache on task mutations

Modify `src/hooks/use-tasks.ts` — mutations that change task count or completion status need to update issue list cache.

Each hook already receives `projectId` and `issueNumber` as parameters.

- [x] In `useCreateTask` `onMutate`: after updating tasks cache, update issue list cache:
  - Increment `totalTasks` by 1
  - Set `updatedAt` to `new Date().toISOString()`
- [x] In `useCreateTask` `onError`: add `queryClient.invalidateQueries({ queryKey: ['issues', projectId] })`
- [x] In `useCreateTask` `onSettled`: add `queryClient.invalidateQueries({ queryKey: ['issues', projectId] })`

- [x] In `useSetTaskDone` `onMutate`: after updating tasks cache, update issue list cache:
  - If `done` is `true`: increment `completedTasks` by 1
  - If `done` is `false`: decrement `completedTasks` by 1
  - Set `updatedAt` to `new Date().toISOString()`
- [x] In `useSetTaskDone` `onError`: add `queryClient.invalidateQueries({ queryKey: ['issues', projectId] })`
- [x] In `useSetTaskDone` `onSettled`: add `queryClient.invalidateQueries({ queryKey: ['issues', projectId] })`

- [x] In `useDeleteTask` `onMutate`: after updating tasks cache, update issue list cache:
  - Count descendants being removed (already computed as `idsToRemove`) and how many of those are `done`
  - Decrement `totalTasks` by `idsToRemove.length`
  - Decrement `completedTasks` by count of done tasks in `idsToRemove`
  - Set `updatedAt` to `new Date().toISOString()`
- [x] In `useDeleteTask` `onError`: add `queryClient.invalidateQueries({ queryKey: ['issues', projectId] })`
- [x] In `useDeleteTask` `onSettled`: add `queryClient.invalidateQueries({ queryKey: ['issues', projectId] })`

Import `IssueListItem` from `naholo-api/types` at the top of the file.

Note: `useUpdateTask` (name change), `useUpdateTaskNote` (note change), and `useMoveTask` (reorder) do not affect task counts or completion status, so they do not need issue list cache updates.

## Notes

- The `lastLogPreview` is the first 100 characters of the most recent log content. The backend truncates with `.slice(0, 100)` — match this on the client.
- Logs are stored in chronological order (oldest first) in the cache array. The last element is the most recent log.
- For `useDeleteTask`, the `getDescendantIds` helper already collects all IDs to remove — reuse `previousTasks` to count how many of those are `done`.
- All issue list cache updates follow the same loop pattern from `useUpdateIssueTitle`: iterate over `['open', 'closed']` filters and `setQueryData` on each.
