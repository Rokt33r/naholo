# P3: Inline Subtask Creation

## Problem

Currently, `creationDialogState` in task-context.tsx is set when:

- "Add subtask" button is clicked (sets `parentTaskId` to the task, `afterTaskId` to last child)
- Enter is pressed while editing a task name (sets `parentTaskId` to same parent, `afterTaskId` to current task)

But **nothing consumes this state** to actually render a creation input. The only creation UI is the root-level input at the bottom of tasks-list.tsx, which has its own independent `isCreating` state.

## Goal

Display an inline "new task" input that appears at the right position in the task list — under a parent task when adding a subtask, or between siblings when pressing Enter. A single input that moves to wherever the user wants to create a task.

## Approach: Flatten the task tree for rendering

Currently, tasks are rendered recursively (`TaskItem` renders child `TaskItem`s). This makes it hard to insert a single creation input at an arbitrary position because each level owns its own rendering.

**Flatten the tree into a single ordered list**, where each item knows its depth. The creation input becomes just another row inserted at the correct position.

## Implementation Steps

### 1. Add a flatten helper to task-context.tsx

Add a `getFlattenedTasks()` function that returns tasks in depth-first pre-order with computed depth:

```ts
type FlatTask = {
  task: Task
  depth: number
}
```

This walks the tree: root tasks → for each, recurse into subtasks (if expanded). The result is the visual order users see.

Expand/collapse state needs to move from individual TaskItems into the context (so the flattener knows which subtrees to skip).

### 2. Replace recursive rendering in tasks-list.tsx

Instead of:

```tsx
{rootTasks.map(task => <TaskItem task={task} subtasks={...} depth={0} />)}
```

Render the flattened list:

```tsx
{flattenedItems.map((item, i) => {
  if (item.type === 'task') {
    return <TaskItem task={item.task} depth={item.depth} />
  }
  if (item.type === 'creation') {
    return <InlineTaskInput parentTaskId={...} depth={item.depth} position={...} />
  }
})}
```

The creation input row is inserted into the flat list at the right position based on `creationDialogState`:

- `afterTaskId` determines where in the list it goes (right after that task and all its descendants)
- `parentTaskId` determines the depth (indentation) and what parent the new task gets
- If `afterTaskId` is null and `parentTaskId` is set, insert at the beginning of that parent's children

### 3. Simplify TaskItem (remove recursive subtask rendering)

TaskItem no longer renders its own subtasks — the flat list handles ordering. TaskItem becomes a pure single-row component:

- Remove the `subtasks` prop
- Remove the recursive `{subtasks.map(...)}` block
- Keep expand/collapse button (but toggle state in context, not local)
- `depth` prop controls `ml-6` indentation as before

### 4. Unify creation input

Replace the separate root-level creation state (`isCreating`, `newTaskName`, etc. in tasks-list.tsx) with the shared `creationDialogState` from context:

- Clicking the bottom area → `openCreateDialog(null, lastRootTask?.id ?? null)` (root level, after last task)
- The inline creation input appears in the flat list at the right spot
- Enter submits and opens a new creation input at the same level (continuous entry)
- Escape closes the creation input
- Clicking "Add subtask" on a task → `openCreateDialog(task.id, lastSubtask?.id ?? null)`
- Pressing Enter while editing task name → `openCreateDialog(task.parentTaskId, task.id)` (already implemented)

### 5. Remove unused creationDialog types/state (cleanup)

After the new system is in place, the old `CreationDialogState` type can be simplified or replaced. The existing `openCreateDialog`/`closeCreateDialog` methods stay — they're the API for triggering creation.

## Expand/Collapse State

Currently `isExpanded` is local state in each TaskItem. For flattening, we need this in context:

- `expandedTaskIds: Set<string>` — tasks whose children are visible (default: all expanded)
- `toggleExpanded(taskId)` — flip a task's expanded state
- The flatten function skips children of collapsed tasks

## Keyboard & Focus Considerations

- Arrow up/down navigation already uses `getNextVisibleTask`/`getPreviousVisibleTask` — these should still work since the flat list respects the same DFS order
- When the creation input is visible, arrow keys should allow navigating to/from it
- After creating a task, focus moves to the new task (or stays on creation input for continuous entry)
- Escape on creation input → close it, focus the task that triggered creation

## Files to Change

| File             | Changes                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| task-context.tsx | Add `expandedTaskIds` state, `toggleExpanded`, `getFlattenedTasks()` helper. Keep `creationDialogState`/`openCreateDialog`/`closeCreateDialog`.                                                              |
| tasks-list.tsx   | Replace recursive root rendering with flat list rendering. Remove local `isCreating`/`newTaskName` state — use `creationDialogState` from context. Add `InlineTaskInput` component (or extract to own file). |
| task-item.tsx    | Remove `subtasks` prop and recursive rendering. Read expand/collapse from context. Becomes a single-row component.                                                                                           |
| task-actions.tsx | No changes needed (already calls `onAddSubtask` which triggers `openCreateDialog`).                                                                                                                          |
