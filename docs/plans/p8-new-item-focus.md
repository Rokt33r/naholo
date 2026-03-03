# P8: New Task Item Focus Ring, Save on Blur & Focus Restoration

## Goal

1. Display a blue focus ring on `NewTaskItem` when its input is focused.
2. Save the new item when the input loses focus (blur).
3. Properly manage focus after save/cancel depending on the trigger.

## Focus-After Behavior

| Action         | Trigger | Focus after                                              |
| -------------- | ------- | -------------------------------------------------------- |
| Save           | Enter   | The newly created task                                   |
| Save           | Blur    | No focus change (whatever was clicked gets focus)        |
| Cancel (empty) | Enter   | The previously focused task                              |
| Cancel (empty) | Blur    | No focus change                                          |
| Cancel         | Escape  | Same as Enter cancel — focus the previously focused task |

## Current Behavior

- `NewTaskItem` auto-focuses its input on mount but has **no visible focus ring**.
- On blur with empty input, it closes. On blur with content, it stays open without saving.
- Enter saves and opens a new input for the next task (no focus on created task).
- Existing `TaskItem` shows `ring-2 ring-blue-500` when `isFocused && isListFocused`.
- DOM focus uses `document.querySelector(`[data-task-id="${id}"]`)` + `requestAnimationFrame`.

## Changes

### 1. Track previously focused task — `task-context.tsx`

Store `previousFocusedTaskId` in `newTaskItemState` so `NewTaskItem` can restore focus on cancel.

```tsx
// Current
const [newTaskItemState, setNewTaskItemState] = useState<{
  parentTaskId: string | null
  afterTaskId: string | null
} | null>(null)

// New — add previousFocusedTaskId
const [newTaskItemState, setNewTaskItemState] = useState<{
  parentTaskId: string | null
  afterTaskId: string | null
  previousFocusedTaskId: string | null
} | null>(null)
```

Update `openNewTaskItem` to capture `focusedTaskId` at call time:

```tsx
const openNewTaskItem = useCallback(
  (parentTaskId: string | null, afterTaskId: string | null) => {
    setNewTaskItemState({
      parentTaskId,
      afterTaskId,
      previousFocusedTaskId: focusedTaskId,
    })
  },
  [focusedTaskId],
)
```

Expose `previousFocusedTaskId` from the state for `NewTaskItem` to consume.

### 2. Add focus ring — `new-task-item.tsx`

Track local `isFocused` state. Apply ring classes on the row container:

```tsx
const [isFocused, setIsFocused] = useState(false)

<div
  onFocus={() => setIsFocused(true)}
  onBlur={() => setIsFocused(false)}
  className={cn(
    'flex items-start rounded py-1 px-2',
    isFocused && 'z-10 ring-2 ring-blue-500',
  )}
>
```

### 3. Split save handlers — `new-task-item.tsx`

Extract shared position calculation, then define two save paths:

```tsx
const getPosition = () => {
  if (afterTaskId) {
    const siblings = parentTaskId ? getSubtasks(parentTaskId) : getRootTasks()
    const afterTask = siblings.find((t) => t.id === afterTaskId)
    return afterTask ? afterTask.position + 1 : 0
  }
  return 0
}
```

**`handleSaveAndFocus`** — called on Enter:

```tsx
const handleSaveAndFocus = async () => {
  const trimmed = name.trim()
  if (!trimmed) return
  const newTaskId = await createTask(trimmed, null, parentTaskId, getPosition())
  closeNewTaskItem()
  if (newTaskId) {
    setFocusedTaskId(newTaskId)
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-task-id="${newTaskId}"]`,
      ) as HTMLElement | null
      el?.focus()
    })
  }
}
```

**`handleSaveQuiet`** — called on blur:

```tsx
const handleSaveQuiet = async () => {
  const trimmed = name.trim()
  if (!trimmed) return
  await createTask(trimmed, null, parentTaskId, getPosition())
  closeNewTaskItem()
}
```

### 4. Focus restoration on cancel — `new-task-item.tsx`

**`handleCancelAndRestore`** — called on Enter (empty) and Escape:

```tsx
const handleCancelAndRestore = () => {
  closeNewTaskItem()
  if (previousFocusedTaskId) {
    setFocusedTaskId(previousFocusedTaskId)
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-task-id="${previousFocusedTaskId}"]`,
      ) as HTMLElement | null
      el?.focus()
    })
  }
}
```

### 5. Wire up event handlers — `new-task-item.tsx`

```tsx
const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (name.trim()) {
      handleSaveAndFocus()
    } else {
      handleCancelAndRestore()
    }
  }
  if (e.key === 'Escape') {
    handleCancelAndRestore()
  }
}
```

```tsx
onBlur={() => {
  if (name.trim()) {
    handleSaveQuiet()
  } else {
    closeNewTaskItem()
  }
}}
```

## Summary of Edits

| File                | What                   | Detail                                                                          |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `task-context.tsx`  | Track previous focus   | Add `previousFocusedTaskId` to `newTaskItemState`, capture in `openNewTaskItem` |
| `new-task-item.tsx` | Focus ring             | Local `isFocused` state, conditional `ring-2 ring-blue-500` on row container    |
| `new-task-item.tsx` | Save on Enter          | `handleSaveAndFocus` — save, close, focus created task via DOM query            |
| `new-task-item.tsx` | Save on blur           | `handleSaveQuiet` — save and close, no focus change                             |
| `new-task-item.tsx` | Cancel on Enter/Escape | `handleCancelAndRestore` — close, restore focus to `previousFocusedTaskId`      |
| `new-task-item.tsx` | Cancel on blur         | `closeNewTaskItem()` only, no focus change                                      |
