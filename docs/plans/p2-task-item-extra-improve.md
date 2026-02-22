Improve task-item component.

src/components/tasks/task-item.tsx

# 1. Use input for task input and don't render multi line

- [x] Replace `AutoResizeTextarea` with `<input type="text">` in `task-item.tsx`
- [x] Remove the `AutoResizeTextarea` import (no longer needed in this file)
- [x] Update `nameTextareaRef` → `nameInputRef` with `HTMLInputElement` type
- [x] Update `handleTaskNameTextareaKeyDown` → `handleTaskNameInputKeyDown` with `KeyboardEvent<HTMLInputElement>`
- [x] Simplify Enter handler: no need for `!e.shiftKey` check since input doesn't support multiline

name should be a single sentence. Other info should go note.

## Files

- `src/components/tasks/task-item.tsx`

# 2. Display placeholder for note even note content is not available.

- [x] Change grid visibility condition from `isFocused && (task.note || isEditingNote)` to `isFocused` in `task-note.tsx`
- [x] Add third render state: when `!task.note && !isEditingNote`, show dimmed "Note" placeholder
- [x] Placeholder opens note editor on click, styled with `text-sm text-muted-foreground cursor-text`

We should just say "Note" with dimmed color so people can notice it.

## Files

- `src/components/tasks/task-note.tsx`

# 3. Unindent task

- [x] In `outdentTask` (`task-context.tsx`), change `newPosition = parentIndex + 1` to `newPosition = parent.position + 1`

Unindent task should go below its parent task, not over.

`parentIndex` is an **array index**, but `newPosition` is sent to the server as a **position value**. If positions have gaps, the task lands at the wrong position. The server-side `moveTask` uses `gte(tasks.position, newPosition)` to shift, so it expects a position value.

## Files

- `src/components/tasks/task-context.tsx`

# 5. Task item checkbox layout

- [x] Change main row from `items-center` to `items-start` in `task-item.tsx`
- [x] Add `mt-1` to checkbox (16px in 24px line → 4px offset)
- [x] Add `mt-0.5` to expand button (20px in 24px line → 2px offset)

Currently the checkbox is aligned to center (vertically) with flex layout. When note preview appears, checkbox shifts. Fix by pinning to top and adding margin to center within the name line height (`leading-6` = 24px).

## Files

- `src/components/tasks/task-item.tsx`

# 6. Task item checkbox border

- [x] Add `border-zinc-300 dark:border-zinc-600` className override on `<Checkbox>` in `task-item.tsx`

The border color is too dimmed. `--input` resolves to `oklch(0.922 0 0)` (light) / `oklch(0.269 0 0)` (dark) — nearly invisible. Targeted override avoids affecting other checkboxes app-wide.

## Files

- `src/components/tasks/task-item.tsx`

# 7. Focus control after unindent

- [ ] Make `handleRowKeyDown` Tab case async
- [ ] After `await outdentTask(task.id)`, use `requestAnimationFrame` to query `[data-task-id="${task.id}"]` and `.focus()`
- [ ] Apply same fix to `indentTask` for consistency

After unindent, focusing is missing so users cannot indent again. When indent/outdent completes, React re-renders the component at a new DOM position, so the old focused element is unmounted and browser focus is lost. Same re-focus pattern as `handleDeleteWithFocus`.

## Files

- `src/components/tasks/task-item.tsx`
