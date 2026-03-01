# P4: Fix Input/Textarea Selection Reset During Editing

## Problem

When editing a task name or task note, the cursor/selection resets to the end of the text on every keystroke. This makes it impossible to edit content in the middle of text.

## Root Cause

Two `useEffect` hooks have `name.length` / `noteContent.length` in their dependency arrays, causing `setSelectionRange()` to fire on **every keystroke** and move the cursor to the end.

### Task Name (`task-item.tsx:67-72`)

```tsx
useEffect(() => {
  if (isEditing && nameInputRef.current) {
    nameInputRef.current.focus()
    nameInputRef.current.setSelectionRange(name.length, name.length)
  }
}, [isEditing, name.length]) // <-- name.length changes every keystroke
```

### Task Note (`task-note.tsx:48-56`)

```tsx
useEffect(() => {
  if (isEditingNote && noteTextareaRef.current) {
    noteTextareaRef.current.focus()
    noteTextareaRef.current.setSelectionRange(
      noteContent.length,
      noteContent.length,
    )
  }
}, [isEditingNote, noteContent.length]) // <-- noteContent.length changes every keystroke
```

## Fix

Remove `name.length` / `noteContent.length` from the dependency arrays. These effects should only run when editing **starts** (i.e., when `isEditing` / `isEditingNote` transitions to `true`), not on every keystroke.

### Step 1: Fix `task-item.tsx` (line 72)

Change:

```tsx
}, [isEditing, name.length])
```

To:

```tsx
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [isEditing])
```

### Step 2: Fix `task-note.tsx` (line 56)

Change:

```tsx
}, [isEditingNote, noteContent.length])
```

To:

```tsx
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [isEditingNote])
```

### Why this is safe

- The purpose of these effects is to focus + select-all when entering edit mode
- `name.length` / `noteContent.length` were only used to position the cursor at the end
- When `isEditing` becomes `true`, the local state is already set to the current value (see `handleTaskNameClick` at line 83-85), so the ref's value will be correct at that point
- The `eslint-disable` is needed because the linter wants exhaustive deps, but re-running on content length changes is the actual bug
