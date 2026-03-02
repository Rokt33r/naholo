# P6: Task Note Display Improvements

## Goal

Make task notes always visible as rendered markdown beneath the task name, instead of hiding them behind focus state. This improves scannability — users can see all notes at a glance without clicking each task.

## Current Behavior

- When a task has a note and is **not focused**, only the first line is shown as a truncated plain-text preview below the task name (in `task-item.tsx`, lines 352-356)
- The full note section (rendered markdown or textarea) is only revealed when the task **is focused**, via an animated grid-row transition in `TaskNote` (`grid-rows-[0fr]` → `grid-rows-[1fr]`)
- Rendered markdown uses default prose colors; textarea has no muted styling

## Changes

### 1. Remove one-line preview from `task-item.tsx`

**File:** `src/components/tasks/task-item.tsx`

Remove the `noteFirstLine` variable (line 57) and the conditional preview block (lines 352-356):

```tsx
// REMOVE this variable
const noteFirstLine = task.note ? task.note.split('\n')[0] : null

// REMOVE this block
{
  task.note && !isFocused && (
    <div className='truncate text-xs text-muted-foreground'>
      {noteFirstLine}
    </div>
  )
}
```

### 2. Always display rendered task note in `task-note.tsx`

**File:** `src/components/tasks/task-note.tsx`

The note section needs two separate animated wrappers since they have different visibility rules:

1. **Rendered markdown wrapper** — always visible when note exists, no animation needed (just render or not)
2. **Textarea wrapper** — animated with grid-row transition, shown on focus (for empty-note case) or when `isEditingNote` is true

Split the current single grid-animated container into two parts:

- **Markdown section**: rendered outside the animation wrapper. Simply present when `task.note && !isEditingNote`, absent otherwise. No transition.
- **Textarea section**: inside the grid-animated wrapper. Transition `grid-rows-[0fr]` → `grid-rows-[1fr]` when entering edit mode or when focused with no note.

Textarea animation logic:

```tsx
isEditingNote || (isFocused && !task.note)
  ? 'grid-rows-[1fr]'
  : 'grid-rows-[0fr]'
```

### 2a. Simplify note display states

Currently `TaskNote` renders 3 states: textarea, rendered markdown, placeholder. Simplify to **2 states**:

- **Editing** (`isEditingNote`): show `AutoResizeTextarea`
- **Not editing**: show rendered markdown via `MarkdownView` (if note exists), or nothing (if no note and not focused), or just the empty textarea (if no note and focused)

Actually, for the "focused but no note" case, just show the textarea directly (with placeholder text) instead of a separate placeholder `<div>`. This removes the placeholder branch entirely.

Summary of render logic:

```
Markdown section (no animation):
  task.note && !isEditingNote → show rendered markdown

Textarea section (animated grid-row):
  isEditingNote → show textarea (animated open)
  isFocused && !task.note → show textarea as placeholder (animated open)
  else → collapsed (grid-rows-[0fr])
```

### 2b. Change edit-entry behavior

- **Double-click** rendered markdown → enter edit mode (was single-click)
- **Focused + no note** → show textarea directly (no separate placeholder needed)
- Single-click on rendered markdown when focused does nothing

### 3. Use muted color for rendered markdown and textarea

**File:** `src/components/tasks/task-note.tsx`

- Add `text-muted-foreground` to the rendered markdown container so note text is visually subdued compared to the task name
- Add `text-muted-foreground` to the textarea so it matches the rendered view

```tsx
// Rendered markdown wrapper
<div className='... text-muted-foreground'>
  <MarkdownView ...>{task.note}</MarkdownView>
</div>

// Textarea
<AutoResizeTextarea
  className='... text-muted-foreground'
  ...
/>
```

## Files to Change

| File                                 | Change                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `src/components/tasks/task-item.tsx` | Remove `noteFirstLine` variable and one-line preview block              |
| `src/components/tasks/task-note.tsx` | Always show note when it exists; muted colors for markdown and textarea |

## Props Change

- `TaskNote.isFocused` is still needed — it controls whether the textarea appears for tasks with no note.

## Testing Checklist

- [ ] Task with note: rendered markdown is always visible (even when not focused)
- [ ] Task without note: note section is hidden when not focused, textarea appears when focused
- [ ] Focused task with note: **double-clicking** rendered markdown enters edit mode
- [ ] Focused task with note: single-clicking does NOT enter edit mode
- [ ] Unfocused task with note: double-clicking does NOT enter edit mode (focuses the task row instead)
- [ ] Focused task without note: textarea shows directly (no separate placeholder element)
- [ ] Rendered markdown uses muted color
- [ ] Textarea uses muted color
- [ ] Task with note: no animation when focusing/unfocusing (markdown is always static)
- [ ] Task without note: textarea animates in/out on focus/unfocus
- [ ] Task with note: textarea animates in on double-click edit, animates out on save (markdown reappears)
- [ ] Keyboard shortcuts (`n` to edit note, `Tab` cycling) still work correctly
