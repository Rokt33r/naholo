@src/components/notes/note-view.tsx

# P12: Improve Issue Note UI

Issue Note features look awful. Need to fix and improve.

## Current State

- NoteView toggles between view (MarkdownView) and edit (textarea) by clicking
- Editing requires explicit Save (Cmd+Enter) / Cancel buttons
- No split view, no persistent editor
- No debounce — saving is manual
- Uses raw `<textarea>` instead of `AutoResizeTextarea`

## Changes

### 1. Debounced Auto-Save (no more Save/Cancel buttons)

- Add a `useDebounce` hook in `src/hooks/use-debounce.ts`
  - Simple: returns debounced value after a delay (e.g., 800ms)
- Content editing flow:
  - User types in textarea -> local `content` state updates immediately
  - Debounced value triggers `updateNote` mutation automatically via `useEffect`
  - Show a subtle save indicator in the header: "Saving..." spinner / "Saved" checkmark
  - No Save/Cancel buttons needed
- Title editing flow:
  - Keep current inline edit on click, save on blur/Enter (already works this way)
  - Also debounce title saves the same way if desired, or keep as-is since it's short

### 2. View Mode Switching (Editor / Split / Preview)

Replace the current binary `isEditingContent` toggle with a `viewMode` state.

**State:** `viewMode: 'editor' | 'split' | 'preview'` (default: `'editor'`)

**Mode button group in header:**

- Place on the right side of the title row, before the dropdown menu
- Use existing `ButtonGroup` + `Button` (size `icon-sm`, variant `ghost`/`secondary`)
- Three icon buttons:
  - `PenLine` — Editor mode
  - `Columns2` — Split mode
  - `Eye` — Preview mode
- Active mode button gets `secondary` variant, others get `ghost`

**Content area rendering by mode:**

- **Editor**: Full-width textarea (use `AutoResizeTextarea` or a flex-1 textarea)
- **Split**: Side-by-side with a 50/50 layout — left is textarea, right is `MarkdownView`. Use `flex` with `w-1/2` for each pane, separated by a border.
- **Preview**: Full-width `MarkdownView` (read-only)

**Double-click to switch mode:**

- In **Editor** mode: double-click anywhere -> switch to **Preview**
- In **Split** mode:
  - Double-click in the preview pane -> switch to **Preview**
  - Double-click in the editor pane -> switch to **Editor**
- In **Preview** mode: double-click anywhere -> switch to **Editor**
- Use `onDoubleClick` handlers on the respective panes

### 3. Layout Changes

- Editor textarea: replace raw `<textarea>` with `AutoResizeTextarea` (already exists in ui/)
  - In editor/split mode, textarea should fill available height (`flex-1`, `min-h-0`)
- Remove the Save/Cancel button row entirely
- Content area should use `flex flex-1 min-h-0 overflow-hidden` for proper scrolling

## Files to Change

| File                                 | Change                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `src/hooks/use-debounce.ts`          | **New** — `useDebounce(value, delay)` hook                                                         |
| `src/components/notes/note-view.tsx` | Rewrite: view mode state, debounced save, split layout, mode toggle buttons, double-click handlers |

## Implementation Notes

- `useDebounce` is a simple hook — no need for a library:
  ```ts
  function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
      const timer = setTimeout(() => setDebounced(value), delay)
      return () => clearTimeout(timer)
    }, [value, delay])
    return debounced
  }
  ```
- The auto-save effect should skip saving when content matches the server value (from `note.content`) to avoid unnecessary API calls
- When `note` prop changes (e.g., switching tabs), reset local state to new note's values
- Icons from `lucide-react`: `PenLine`, `Columns2`, `Eye`, `Check`, `Loader2`
