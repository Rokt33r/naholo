# Plan: Split task-item.tsx into Manageable Modules

## Context

`task-item.tsx` is 585 lines and handles too many concerns: task rendering, name editing, note editing, keyboard navigation, action menus, and recursive subtask rendering. This makes the file hard to navigate and reason about. The goal is to extract genuinely separable pieces into focused modules while keeping the public API (`TaskItemProps`) unchanged.

## Files to Create

- `src/components/ui/auto-resize-textarea.tsx` — Reusable component (pattern duplicated 3x today)
- `src/components/tasks/task-actions.tsx` — Dropdown menu + action buttons (pure presentational)
- `src/components/tasks/task-note.tsx` — Note editing widget (self-contained state cycle)

## Files to Modify

- `src/components/tasks/task-item.tsx` — Remove extracted code, use new components
- `src/components/tasks/tasks-list.tsx` — Use new auto-resize component

## What NOT to Extract

- **Keyboard handlers** — They read/write 10+ pieces of local state. A hook with that many params adds indirection without reducing complexity. They're most readable inline.
- **Expand/checkbox/name section** — ~30 lines of tightly coupled JSX. Not worth a separate file.
- **`navigateToTask` / `handleDeleteWithFocus`** — 15-25 lines each, component-specific, not reusable.

---

## Step 1: Extract `AutoResizeTextarea` Component

The same 4-line auto-resize pattern appears in `task-item.tsx` (×2) and `tasks-list.tsx` (×1). Instead of a hook that requires manual ref wiring, a drop-in `<textarea>` replacement is cleaner.

- [x] Create `src/components/ui/auto-resize-textarea.tsx` — `forwardRef` wrapping `<textarea>` with auto-resize via `useEffect`
- [x] Modify `task-item.tsx` — swap `<textarea>` → `<AutoResizeTextarea>`, remove auto-resize effects
- [x] Modify `tasks-list.tsx` — swap `<textarea>` → `<AutoResizeTextarea>`, remove auto-resize effect

---

## Step 2: Extract `TaskActions` Component

The action buttons area (lines 457-520) is 63 lines of purely presentational JSX with no local state.

- [x] Create `src/components/tasks/task-actions.tsx` — pure presentational component with callback props
- [x] Modify `task-item.tsx` — replace action buttons JSX with `<TaskActions ... />`

---

## Step 3: Extract `TaskNote` Component

The note section has its own state cycle (view → edit → save → view), its own textarea, keyboard handler, blur handler, and animated container. It accounts for ~100 lines of logic + ~40 lines of JSX.

- [x] Create `src/components/tasks/task-note.tsx` — note editing widget with own state, keyboard handler, animated container
- [x] Modify `task-item.tsx` — replace note JSX with `<TaskNote>`, remove note state/effects/handlers (keep `isEditingNote` state + reset effect + `noteFirstLine`)

---

## Step 4: Clean Up

- [ ] Remove unused imports from `task-item.tsx` (`MarkdownView`, `noteTextareaRef`, etc.)
- [ ] Verify `skipBlurSaveRef` in task-item.tsx only serves the name textarea
- [ ] Confirm final line count is ~350-370 (down from 585)

---

## Result

```
src/
  components/
    ui/
      auto-resize-textarea.tsx     (NEW, ~25 lines)
    tasks/
      task-item.tsx                (~350-370 lines, down from 585)
      task-note.tsx                (NEW, ~110-120 lines)
      task-actions.tsx             (NEW, ~70-80 lines)
      task-context.tsx             (unchanged)
      tasks-list.tsx               (minor: use new component)
      linkified-text.tsx           (unchanged)
```

## Risks

- **`skipBlurSaveRef` split**: Currently shared between name and note blurs. After extraction each component has its own — this is actually cleaner. Key scenario: Tab from name sets parent's ref, name blur fires and skips correctly, note mounts with its own independent ref.
- **Controlled `isEditingNote`**: Bidirectional control (parent sets true, child sets false via prop). Standard React pattern but all paths must be verified: row 'n' key, Tab from name, Escape from note, Tab from note, blur from note, focus-leaves-task effect.

## Verification

After all steps, run through these scenarios end-to-end:

- [ ] Create, edit, complete, delete tasks
- [ ] Keyboard navigation (arrows, Tab indent/outdent, Enter to edit, Escape to exit)
- [ ] Note editing (n key, Tab cycling between name/note, Escape, blur save)
- [ ] Action menu (all 7 items: edit, move up/down, indent/outdent, delete)
- [ ] Subtask expand/collapse
- [ ] Loading spinner during async operations
- [ ] Focus ring appears/disappears correctly
