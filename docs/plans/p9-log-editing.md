@src/components/logs/log-item.tsx

# P9: Log Editing UX Improvements

## Goal

Streamline log editing to feel inline and lightweight — more like editing a cell in a spreadsheet than opening a modal form.

## Current Behavior

- Edit triggered via dropdown menu (three-dot icon on hover → "Edit")
- Editing opens a separate textarea with explicit Save/Cancel buttons
- Save: `Cmd+Enter` or clicking "Save" button
- Cancel: `Escape` or clicking "Cancel" (immediately discards, no confirmation)
- Textarea has a fixed `min-h-[100px]` and `resize-none`

## Desired Behavior

### Enter Edit Mode

- **Double-click** on the log content bubble to enter edit mode
- Keep the dropdown menu "Edit" option as a secondary entry point
- Textarea should replace the markdown view inline (same position, no layout shift)
- Auto-focus the textarea and place cursor at end of content

### Save

- **Blur** (clicking outside) → save
- **Enter** (without Shift) → save
- Skip API call if content hasn't changed (just exit edit mode)
- Trim content before saving; if trimmed content is empty, don't save (revert to original)

### New Line

- **Shift+Enter** → insert new line (consistent with the log input at bottom)

### Cancel

- **Escape** → if content has changed from original, show a confirmation dialog:
  - "Discard changes? Your edits will be lost."
  - Actions: "Discard" (exit edit mode, revert content) / "Keep editing" (return focus to textarea)
- **Escape** → if content is unchanged, simply exit edit mode (no dialog)

### Delete

- Keep the existing dropdown menu "Delete" option with `confirm()` dialog (no changes)

## Implementation Details

### Changes to `LogItem` component

1. **Add `onDoubleClick` handler** on the log content `<div>` to trigger `handleEdit()`

2. **Replace textarea with `AutoResizeTextarea`** to match the input style at bottom and auto-fit content height (no fixed min-height)

3. **Update keyboard handling:**
   - `Enter` (without Shift, not composing) → `handleSave()`
   - `Shift+Enter` → default behavior (new line)
   - `Escape` → check if content differs from `log.content`:
     - Changed: show discard confirmation dialog
     - Unchanged: `setIsEditing(false)`
   - Remove `Cmd+Enter` save shortcut

4. **Add `onBlur` handler** on the textarea → `handleSave()`
   - Guard against blur triggered by clicking the discard confirmation dialog (use a ref flag like `isDiscardDialogOpen` to skip save on blur when dialog is showing)

5. **Remove Save/Cancel buttons** — saving and canceling are now handled entirely via keyboard and blur

6. **Discard confirmation dialog:**
   - Use Radix `AlertDialog` (already available in the project's UI primitives)
   - On "Keep editing": close dialog, re-focus textarea
   - On "Discard": revert `content` to `log.content`, `setIsEditing(false)`

### Edge Cases

- **Blur + Escape race condition**: If user presses Escape, the confirmation dialog may steal focus and trigger blur. Use a ref (`skipBlurSave`) set to `true` before showing the dialog, checked in the blur handler.
- **Optimistic temp logs** (`id.startsWith('temp-')`): Disable double-click editing while log is still being created (already handled — dropdown menu is hidden for temp logs).
- **Empty content after trim**: Don't save empty logs. Revert to original content and exit edit mode.
- **IME composition** (e.g., Korean/Japanese input): Check `e.nativeEvent.isComposing` before handling Enter to prevent premature save during composition.
