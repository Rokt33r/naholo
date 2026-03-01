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

- [x] 1. Add flatten helper to task-context.tsx — `FlatTask` type, `collapsedTaskIds` state, `isTaskExpanded`/`toggleExpanded`, `getFlattenedTasks()`
- [x] 2. Replace recursive rendering in tasks-list.tsx — flat list with creation input insertion logic
- [x] 3. Simplify TaskItem — removed `subtasks` prop and recursive rendering, uses context for expand/collapse
- [x] 4. Unify creation input — `NewTaskItem` component (new-task-item.tsx), root creation uses `openCreateDialog`
