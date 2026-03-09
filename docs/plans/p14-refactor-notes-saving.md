# P14: Refactor Notes Saving

## Problem

Note saving status management is too complicated. State flows through 3 layers with fragile coordination:

1. `useDebouncedSave` — tracks per-note debounce/save state internally
2. `NoteView` — reports state upward via `onSaveStateChange` callback + `prevNoteIdRef` hack to clear old tab spinners
3. `IssueDetail` — maintains `notesSaveState: Record<string, DebouncedSaveState>` and passes down to `IssueTabs`

### Specific Issues

- **Prop drilling**: Save state flows `useDebouncedSave → NoteView → IssueDetail → IssueTabs` via callbacks and props
- **Leaky abstraction**: `NoteView` has to manually clear the _previous_ note's spinner via `prevNoteIdRef` (lines 87-93) — this is a symptom of the wrong component owning the state
- **Flush reliability**: Unmount flush in `useDebouncedSave` (line 97-110) is fire-and-forget — the async save can be lost if the component tree unmounts during navigation
- **No visual indicator on inactive tabs**: When a note has unsaved changes but is not the active tab, there's no blue ring/dot on the tab to indicate pending changes

## Solution: Centralized `useIssueNoteStore` Hook

Create a single store hook that owns all note save state and debounce timers for the current issue. This replaces the per-note `useDebouncedSave` instances and the state-reporting callbacks.

### Architecture

```
useIssueNoteStore (lives in IssueDetail)
├── Manages: Record<noteId, { content, saveState, timer, lastSaved }>
├── Provides: setContent(noteId, value), flush(noteId), flushAll()
├── Exposes: getSaveState(noteId) for tab indicators
└── NoteView just calls setContent / reads content — no save logic
```

### Store Interface

```typescript
type NoteSaveEntry = {
  content: string
  lastSaved: string
  saveState: DebouncedSaveState // 'idle' | 'debouncing' | 'saving'
  timer: ReturnType<typeof setTimeout> | null
}

type NoteSaveStore = {
  // Called by NoteView on each keystroke
  setContent: (noteId: string, content: string) => void
  // Read content for rendering
  getContent: (noteId: string) => string
  // Get save state for tab indicators
  getSaveState: (noteId: string) => DebouncedSaveState
  // Flush a specific note (on tab switch)
  flush: (noteId: string) => void
  // Flush all pending saves (on issue navigation)
  flushAll: () => void
  // Initialize a note entry (when note data loads)
  initNote: (noteId: string, content: string) => void
}
```

### File: `src/hooks/use-issue-note-store.ts`

A `useRef`-based store (not React state for timers/content to avoid unnecessary re-renders). Only `saveState` per note triggers re-renders via a single `useState<Record<string, DebouncedSaveState>>`.

Key behaviors:

- Content stored in a `Map<string, NoteSaveEntry>` ref
- `setContent(noteId, value)` — starts/resets debounce timer for that note, updates `saveStates` to `'debouncing'`
- Timer fires → calls `updateNote` mutation → sets state to `'saving'` → on complete → `'idle'`
- `flush(noteId)` — immediately saves if pending, clears timer
- `flushAll()` — iterates all entries, flushes each
- On `issueId` change → `flushAll()` then reset store

## Changes

### 1. Create `src/hooks/use-issue-note-store.ts`

- Implement the centralized store as described above
- Accept `updateNote` mutation function and `delay` as params
- Return store interface

### 2. Simplify `NoteView`

- Remove `useDebouncedSave` usage
- Remove `onSaveStateChange` prop and the `prevNoteIdRef` hack
- Accept `content`, `onContentChange`, `saveState` as props instead (dumb component)
- Or accept the store directly and call `store.setContent(note.id, value)`

### 3. Simplify `IssueDetail`

- Instantiate `useIssueNoteStore` with the `updateNote` mutation
- Remove `notesSaveState` state and `handleNoteSaveStateChange` callback
- Pass store's `getSaveState` to `IssueTabs`
- Call `store.flushAll()` on issue navigation (when `issueId` changes)
- Call `store.flush(prevNoteId)` on tab switch

### 4. Update `IssueTabs`

- Read save state from store (or from a passed-down `saveStates` record)
- Add blue ring indicator: when `saveState !== 'idle'` on an _inactive_ tab, show a `ring-2 ring-blue-500` on the tab button (matching the task focus ring style)

### 5. Delete or deprecate `use-debounced-save.ts`

- If no other consumers, remove entirely

## Visual: Tab Indicators

| State      | Active Tab   | Inactive Tab                   |
| ---------- | ------------ | ------------------------------ |
| idle       | Normal       | Normal                         |
| debouncing | Gray spinner | Blue ring (subtle dot or ring) |
| saving     | Blue spinner | Blue ring + blue spinner       |

## Flush Strategy

| Event                       | Action                          |
| --------------------------- | ------------------------------- |
| Switch note tab             | `flush(previousNoteId)`         |
| Switch to Tasks tab         | `flush(previousNoteId)`         |
| Navigate to different issue | `flushAll()`                    |
| Browser unload / unmount    | `flushAll()` via cleanup effect |
