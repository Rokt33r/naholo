# Plan: Fix Focus Handling and Keyboard Events for Task List

## Context

The task list has two problems: (1) the focus ring stays visible even when clicking outside the task list (e.g., issue list, log view), and (2) keyboard shortcuts don't match the desired behavior — Enter should start editing (not create a task), Up/Down should navigate tasks, and Tab/ShiftTab should cycle between name/note fields during editing.

## Files to Modify

- `src/components/tasks/task-context.tsx` — Add list-level focus state and tree navigation helpers
- `src/components/tasks/tasks-list.tsx` — Add container-level focus/blur tracking
- `src/components/tasks/task-item.tsx` — Restructure keyboard handlers, fix focus ring condition

---

## Step 1: List-Level Focus Tracking

**Goal**: Focus ring only shows when the task list has focus. Clicking outside hides it.

**`task-context.tsx`**:

- [x] Add `isListFocused: boolean` state and `setIsListFocused` setter to context
- [x] Add effect: when `isListFocused` becomes false, clear `focusedTaskId` to null
- [x] Add cleanup effect: if `focusedTaskId` references a deleted task, clear it

**`tasks-list.tsx`**:

- [x] Add `containerRef` on the outermost div of `TasksListContent`
- [x] `onFocus` -> `setIsListFocused(true)`
- [x] `onBlur` -> check `e.relatedTarget`; if it's still inside the container, do nothing; otherwise `setIsListFocused(false)`

**`task-item.tsx`**:

- [x] Change `isFocused && 'ring-2 ring-blue-500'` to `isFocused && isListFocused && 'ring-2 ring-blue-500'`
- [x] Add `data-task-id={task.id}` attribute on each row div (needed later for arrow navigation)

**Verify**: Click a task -> ring appears. Click issue list or log view -> ring disappears.

---

## Step 2: Non-Editing Keyboard Shortcuts

**Goal**: Restructure `handleRowKeyDown` for when a task is focused but NOT editing.

**`task-context.tsx`**:

- [x] Add `getNextVisibleTask(taskId)` — depth-first pre-order (first child -> next sibling -> ancestor's next sibling)
- [x] Add `getPreviousVisibleTask(taskId)` — (previous sibling's deepest last descendant -> parent)
- [x] Helper: `getDeepestLastDescendant(taskId)` for walking down to the last leaf
- Note: assumes all subtrees expanded (isExpanded is local state). Arrow handler skips non-rendered tasks by checking DOM element existence.

**`task-item.tsx`** — `handleRowKeyDown`:

- [x] Fix guard: `if (isEditing || isEditingNote) return` (currently only checks `isEditing`)
- [x] Change key bindings:

| Key                    | New Behavior                    | Old Behavior              |
| ---------------------- | ------------------------------- | ------------------------- |
| Enter                  | Start editing task name         | ~~Create new task below~~ |
| ArrowUp                | Focus previous visible task     | (none)                    |
| ArrowDown              | Focus next visible task         | (none)                    |
| Tab                    | Indent task                     | (same)                    |
| Shift+Tab              | Outdent task                    | (same)                    |
| Alt+ArrowUp            | Move task up                    | (same)                    |
| Alt+ArrowDown          | Move task down                  | (same)                    |
| e                      | Edit task name                  | (same)                    |
| n                      | Edit task note                  | (same)                    |
| Cmd+Backspace / Delete | Delete task (with confirmation) | (none)                    |

- [x] Arrow navigation: `requestAnimationFrame` + `document.querySelector('[data-task-id="..."]')` to focus target row. Skip collapsed (non-rendered) tasks in a loop.
- [x] Delete: after deletion, focus next sibling; if none, focus parent.

**Verify**: Enter starts editing. Up/Down navigates tasks. Cmd+Backspace deletes. Tab/ShiftTab still indents/outdents.

---

## Step 3: Editing Keyboard Shortcuts

**Goal**: Restructure keyboard handling when editing name or note.

**`task-item.tsx`** — `handleTextareaKeyDown` (name textarea):

| Key       | New Behavior                                                                               | Old Behavior        |
| --------- | ------------------------------------------------------------------------------------------ | ------------------- |
| Enter     | Save name, finish editing, create new task at same level (same parent, after current task) | (same)              |
| Escape    | Save changes, exit editing, refocus row                                                    | ~~Discard changes~~ |
| Tab       | Save name, switch to note editing                                                          | (none)              |
| Shift+Tab | Save name, switch to note editing                                                          | (none)              |

- [x] All handlers call `e.stopPropagation()` to prevent bubbling to row handler
- [x] Tab: save name synchronously (`setIsEditing(false)`), fire-and-forget API call, then `setIsEditingNote(true)`. Existing `useEffect` auto-focuses note textarea.
- [x] Enter with empty name: just exit editing, don't create a new task
- [x] Enter creates new task: auto-focus and start editing the new task

**`task-item.tsx`** — `handleNoteKeyDown` (note textarea):

| Key       | New Behavior                         | Old Behavior        |
| --------- | ------------------------------------ | ------------------- |
| Escape    | Save note, exit editing, refocus row | ~~Discard changes~~ |
| Tab       | Save note, switch to name editing    | (none)              |
| Shift+Tab | Save note, switch to name editing    | (none)              |

- [x] Both Tab and Shift+Tab go to name field (only 2 fields, both directions wrap around)

**`task-item.tsx`** — Blur handler guards:

- [x] Name textarea `onBlur`: only call `handleSave` if `isEditing` is still true (prevents double-save when Tab handler already handled the transition)
- [x] Note textarea `onBlur`: only call `handleSaveNote` if `isEditingNote` is still true

**Verify**: Tab cycles name <-> note. Escape saves and refocuses row. Enter saves and creates new task at same level.

---

## Edge Cases

- **Task with no note**: Tab from name creates note textarea (already handled — note section renders when `isEditingNote` is true)
- **Collapsed subtrees**: Arrow navigation skips tasks not in DOM (loop until a rendered element is found)
- **Deleted task focus**: After deletion, focus moves to next sibling; if no next sibling, focus parent. Cleanup effect in context clears stale `focusedTaskId`
- **Enter with empty name**: Just exit editing, don't create a new task
- **Enter creates new task**: The newly created task should be automatically focused and in editing mode so the user can type right away
