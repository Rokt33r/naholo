# P5: Improve Task Item Focus

## Problem

Currently, clicking **any** element inside a task row (checkbox, dropdown menu, "add subtask" button) causes the task to become focused. This happens because the row div has `onFocus={handleFocus}` which fires whenever focus moves to any child element — React's `onFocus` bubbles like `focusin`.

**Expected behavior:** Focus (blue ring + note expansion) should only activate when the user clicks the **task name** or navigates via **keyboard**.

## Root Cause

In [task-item.tsx:298-307](src/components/tasks/task-item.tsx#L298-L307), the row div has:

```tsx
<div
  ref={rowRef}
  tabIndex={0}
  onFocus={handleFocus}  // fires for ANY child focus event
  ...
>
```

When a child element (checkbox button, plus button, dropdown trigger — all with `tabIndex={-1}`) is clicked, the browser focuses that element, and React's bubbling `onFocus` propagates to the row, triggering `setFocusedTaskId(task.id)`.

## Solution

**Check `e.target` in the focus handler** to only set focus when the row element itself receives focus (not its children).

### Step 1: Update `handleFocus` to filter by target

In [task-item.tsx:292-294](src/components/tasks/task-item.tsx#L292-L294), change:

```tsx
// Before
const handleFocus = () => {
  setFocusedTaskId(task.id)
}

// After
const handleFocus = (e: FocusEvent<HTMLDivElement>) => {
  if (e.target === rowRef.current) {
    setFocusedTaskId(task.id)
  }
}
```

**Why this works:**

- Clicking the **task name** (`<span>`, non-focusable) → browser focuses nearest focusable ancestor = row → `e.target === rowRef.current` → focus is set
- Clicking the **note preview** (non-focusable div) → same as above → focus is set
- Clicking **checkbox** (`tabIndex={-1}` button) → `e.target` = checkbox button → focus NOT set
- Clicking **plus button** (`tabIndex={-1}`) → `e.target` = button → focus NOT set
- Clicking **dropdown trigger** (`tabIndex={-1}`) → `e.target` = button → focus NOT set
- **Keyboard tab** into row → `e.target === rowRef.current` → focus is set
- **Arrow key navigation** → calls `el.focus()` on the row → `e.target === rowRef.current` → focus is set

### Step 2: Set focus explicitly in `handleTaskNameClick`

In [task-item.tsx:84-87](src/components/tasks/task-item.tsx#L84-L87), add `setFocusedTaskId`:

```tsx
const handleTaskNameClick = () => {
  setFocusedTaskId(task.id) // add this
  setName(task.name)
  setIsEditing(true)
}
```

**Why:** When "Edit" is selected from the dropdown menu, it calls `handleTaskNameClick`. At that point, focus returns to the dropdown trigger (not the row), so the step 1 filter would prevent focus from being set. We need explicit focus here to ensure the task is focused when entering edit mode via the dropdown.

This is also needed for the direct name click path because `setIsEditing(true)` causes the input to render and receive focus (via useEffect), which changes `e.target` away from the row.

## Files to Change

| File                                                | Change                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [task-item.tsx](src/components/tasks/task-item.tsx) | Update `handleFocus` to check `e.target`, add `setFocusedTaskId` to `handleTaskNameClick` |

## Testing Checklist

- [x] Click checkbox → task should NOT become focused (no blue ring, note stays collapsed)
- [x] Click plus (add subtask) button → task should NOT become focused
- [x] Click dropdown menu trigger → task should NOT become focused
- [x] Click task name → task SHOULD become focused, enters edit mode
- [x] Click note preview → task SHOULD become focused, note expands
- [x] Arrow up/down keyboard navigation → focus moves correctly
- [x] Tab into task list → first task gets focused
- [x] Press Enter/e on focused task → enters edit mode
- [x] Press n on focused task → enters note editing
- [x] Escape from edit mode → row stays focused
