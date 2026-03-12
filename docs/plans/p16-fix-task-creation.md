@src/components/tasks/tasks-list.tsx
@src/components/tasks/new-task-item.tsx
@src/components/tasks/task-context.tsx

# P16: Continuous Task Creation

## Problem

When creating tasks, the flow is interrupted after each submission. The user clicks
the task list area, types a task name, presses Enter — and the input disappears.
To add another task they must click the bottom area again. This makes bulk task entry
tedious.

## Current Flow

1. Click bottom area → `openNewTaskItem(null, lastRootTask.id)` → NewTaskItem renders
2. Type name, press Enter → `handleSaveAndFocus()` runs:
   - `createTask(...)` (optimistic)
   - `closeNewTaskItem()` ← **input disappears**
   - Focus moves to the newly created task
3. To add another task, user must click the bottom area again

## Expected Flow

1. Click bottom area → NewTaskItem renders
2. Type name, press Enter →
   - Task is created (optimistically)
   - Input stays open, clears to empty, ready for the next task
   - Input repositions after the newly created task
3. Repeat step 2 for as many tasks as needed
4. Press Enter on empty input OR press Escape → close input, focus last created task

## Changes

### 1. `new-task-item.tsx` — Keep input open after submit

Modify `handleKeyDown` Enter behavior:

- **Current**: calls `handleSaveAndFocus()` which creates task, closes input, focuses task
- **New**: create task, clear input, update `afterTaskId` to the newly created task so the
  input stays positioned after it — but do NOT close the input

```
const handleContinuousCreate = async () => {
  const trimmed = name.trim()
  if (!trimmed) return
  const position = getPosition()
  const newTaskId = await createTask(trimmed, null, parentTaskId, position)
  if (newTaskId) {
    setName('')
    // Update afterTaskId so input renders after the new task
    updateNewTaskItemAfterTaskId(newTaskId)
  }
}
```

On Enter:

- If name is non-empty → `handleContinuousCreate()`
- If name is empty → `handleCancelAndRestore()` (close input, restore focus — same as now)

On Escape → `handleCancelAndRestore()` (same as now)

On blur:

- If name is non-empty → save quietly and close (same as now)
- If name is empty → close (same as now)

### 2. `task-context.tsx` — Add `updateNewTaskItemAfterTaskId`

Add a method to update `newTaskItemState.afterTaskId` without closing/reopening the input:

```ts
const updateNewTaskItemAfterTaskId = (afterTaskId: string) => {
  setNewTaskItemState((prev) => (prev ? { ...prev, afterTaskId } : prev))
}
```

Expose this from the context provider.

### 3. `tasks-list.tsx` — No changes needed

The render logic already positions the creation input based on `newTaskItemState.afterTaskId`.
When context updates `afterTaskId`, the input will re-render at the correct position
(after the newly created task).

## Edge Cases

- **Optimistic task uses temp ID**: `createTask` returns a temp ID like `temp-123456`.
  `afterTaskId` will be set to this temp ID. The render logic in `tasks-list.tsx` finds
  items by `key === afterTaskId`, and temp tasks are in the flattened list, so positioning
  works correctly. When the real ID arrives via cache invalidation, the input position may
  briefly jump — but since the input is at the end of siblings, this is fine.

- **Rapid creation**: Each Enter creates a task optimistically and clears the input
  immediately. No need to wait for the server response. Position increments naturally
  since `getPosition()` reads from the (optimistically updated) task list.

- **Creating subtasks continuously**: Same flow works when `parentTaskId` is set. The input
  stays at the same depth, appending children to the same parent.

- **Focus preservation**: The input ref stays mounted and focused throughout the continuous
  creation flow. No need for `requestAnimationFrame` focus hacks.
