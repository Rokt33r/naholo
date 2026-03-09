@src/components/notes/note-view.tsx
@src/components/issues/issue-tabs.tsx
@src/hooks/use-notes.ts
@src/hooks/use-debounce.ts

## Problem

Currently, the saving indicator only appears in the note header (a spinner next to the title). When a user is editing a note and the save is in progress, the tab itself gives no indication. Also, there's no visual distinction between "debounce waiting" (typing paused but timer hasn't fired yet) and "actually sending to server". Finally, switching tabs while mid-debounce silently discards unsaved content.

## Goals

1. Show saving status in the tab item itself
2. Distinguish debounce-pending vs server-updating with different spinners
3. On tab switch, flush pending debounce immediately and persist optimistically

## Design

### Tab saving indicator

```
Tasks | Note 1 | Note 2
```

If Note 1 is saving (debouncing or updating), show a spinner in its tab:

```
Tasks | Note 1 ○ | Note 2
```

- Gray spinner = debounce pending (content changed, waiting for timer)
- Blue spinner = actively sending update to server

### Implementation

#### 1. New `useDebouncedSave` hook

Replace the current `useDebounce` + `useEffect` pattern in `NoteView` with a dedicated hook that exposes saving state and a flush function.

**File:** `src/hooks/use-debounced-save.ts`

```ts
type DebouncedSaveState = 'idle' | 'debouncing' | 'saving'

type UseDebouncedSaveOptions = {
  noteId: string
  delay?: number // default 800
  onSave: (content: string) => Promise<void>
}

type UseDebouncedSaveReturn = {
  state: DebouncedSaveState
  setContent: (content: string) => void
  flush: () => void // immediately trigger save if pending
}
```

- Internally tracks `lastSavedContent` ref and a timeout ref
- On `setContent`: if content differs from last saved, set state to `'debouncing'` and start/reset timer
- When timer fires: set state to `'saving'`, call `onSave`, then set `'idle'` on completion
- `flush()`: clear timer, if state is `'debouncing'`, immediately trigger `onSave`
- Resets when `noteId` changes (also flushes pending save for previous note)

#### 2. Lift saving state to `IssueDetail`

`NoteView` currently owns its save lifecycle internally. To show status in tabs, the saving state per note must be accessible by `IssueTabs`.

**Approach:** Keep `useDebouncedSave` inside `NoteView` but expose saving state upward via a callback prop.

**Changes to `NoteView` props:**

```ts
type NoteViewProps = {
  note: Note
  projectId: string
  issueId: string
  onDeleted?: () => void
  onSaveStateChange?: (noteId: string, state: DebouncedSaveState) => void
}
```

`NoteView` calls `onSaveStateChange` whenever `useDebouncedSave` state changes.

**Changes to `IssueDetail`:**

- Add `notesSaveState: Record<string, DebouncedSaveState>` state
- Pass `onSaveStateChange` handler to `NoteView` that updates this map
- Pass `notesSaveState` down to `IssueTabs`

#### 3. Update `IssueTabs` to show spinner

**Changes to `IssueTabs` props:**

```ts
type IssueTabsProps = {
  // ...existing
  notesSaveState?: Record<string, DebouncedSaveState>
}
```

For each note tab, check `notesSaveState[note.id]`:

- `'debouncing'` → `<Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />`
- `'saving'` → `<Loader2 className="h-3 w-3 animate-spin text-blue-500" />`
- `'idle'` / undefined → no spinner

#### 4. Flush on tab switch

When the user switches tabs (clicks a different tab or "Tasks"), flush the pending debounce for the current note so content isn't lost.

**In `NoteView`:** Expose `flush` via `useImperativeHandle` or simply flush in a cleanup effect:

```ts
// On unmount or noteId change, flush pending save
useEffect(() => {
  return () => flush()
}, [noteId])
```

This ensures that when React unmounts `NoteView` (tab switch causes different note or tasks to render), the pending content is saved immediately.

#### 5. Remove old debounce pattern from `NoteView`

- Remove `useDebounce(content, 800)` import and usage
- Remove the `debouncedContent` useEffect
- Remove `lastSavedContentRef` (moved into `useDebouncedSave`)
- Use `setContent` from `useDebouncedSave` in the textarea's `onChange`

## File Changes Summary

| File                                     | Change                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `src/hooks/use-debounced-save.ts`        | **New** — debounced save hook with state + flush                               |
| `src/components/notes/note-view.tsx`     | Replace debounce pattern with `useDebouncedSave`, add `onSaveStateChange` prop |
| `src/components/issues/issue-detail.tsx` | Track `notesSaveState` map, pass to tabs and note view                         |
| `src/components/issues/issue-tabs.tsx`   | Accept `notesSaveState`, render per-tab spinner                                |

No backend/API changes needed.
