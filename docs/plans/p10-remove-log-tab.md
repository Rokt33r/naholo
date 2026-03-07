# P10: Remove Log Tab — Display Logs on the Side

Remove the "Logs" tab from the tab bar and always display logs as a side panel (wide screens) or via a toggle button in the header (narrow screens).

## Current Behavior

- Tab bar has: **Logs** | **Tasks** | _Note tabs..._ | **Add Note**
- Default active tab is `logs` (no `?tab=` param → logs tab)
- Wide screen (>=1024px): When on Tasks or Notes tab, logs show in a `ResizablePanel` on the right. When on Logs tab, logs fill the main content area and the side panel is hidden.
- Narrow screen: Logs only visible when the Logs tab is active (full content area).

## Desired Behavior

### Wide Screen (>=1024px)

- **No Logs tab** in the tab bar.
- **No log toggle button** in the header.
- Logs **always** display in the `ResizablePanel` on the right side, regardless of which tab is active.
- Default active tab becomes `tasks` (since logs tab is removed).
- Tab bar shows: **Tasks** | _Note tabs..._ | **Add Note**

### Narrow Screen (<1024px)

- **No Logs tab** in the tab bar.
- A **log toggle button** (e.g., `MessageSquare` icon) appears in the header bar, next to the issue title (not in the tab bar).
- When toggled ON: Only the issue title header + LogsList are visible (tabs and tab content are hidden).
- When toggled OFF: Normal tab view with Tasks / Notes tabs visible.
- Tab bar shows: **Tasks** | _Note tabs..._ | **Add Note**

## Implementation

### 1. Remove `logs` from `ActiveTab` type

**File:** `issue-client-page.tsx`

- Remove `{ type: 'logs' }` from the `ActiveTab` union type.
- Update `parseActiveTab()`: default to `{ type: 'tasks' }` instead of `{ type: 'logs' }`.
- Remove the condition `activeTab.type !== 'logs'` from the `ResizablePanel` render — logs side panel should always show on wide screens.

```typescript
type ActiveTab = { type: 'tasks' } | { type: 'note'; noteId: string }

function parseActiveTab(tabParam: string | null): ActiveTab {
  if (tabParam === 'tasks' || !tabParam) return { type: 'tasks' }
  if (tabParam.startsWith('note:')) {
    return { type: 'note', noteId: tabParam.slice(5) }
  }
  return { type: 'tasks' }
}
```

### 2. Add `showLogs` state for narrow screen toggle

**File:** `issue-client-page.tsx`

- Add `const [showLogs, setShowLogs] = useState(false)` state.
- Pass `showLogs` and `onToggleLogs` down to `IssueDetail`.
- On narrow screens, when `showLogs` is true, render `LogsList` in the main content area instead of tabs+content (handled inside `IssueDetail`).

```typescript
// In IssueClientPage render:
return (
  <div className='flex h-full'>
    <div className='flex-1 overflow-hidden'>
      <IssueDetail
        projectId={issue.projectId}
        issueId={issue.id}
        logs={logs}
        notes={notes}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showLogs={showLogs}
        onToggleLogs={() => setShowLogs((v) => !v)}
        isWideScreen={isWideScreen}
      />
    </div>
    {isWideScreen && (
      <ResizablePanel ...>
        <LogsList ... />
      </ResizablePanel>
    )}
  </div>
)
```

### 3. Remove Logs tab button from `IssueTabs`

**File:** `issue-tabs.tsx`

- Remove the "Logs" `<Button>` entirely.
- Remove `MessageSquare` import (if no longer used here).
- Remove `{ type: 'logs' }` from the local `ActiveTab` type.

### 4. Update `IssueDetail` header and content

**File:** `issue-detail.tsx`

- Accept new props: `showLogs`, `onToggleLogs`, `isWideScreen`.
- **Header:** On narrow screens (`!isWideScreen`), render a `MessageSquare` icon button next to the title that calls `onToggleLogs`. Use `variant='secondary'` when `showLogs` is active, `variant='ghost'` otherwise.
- **Content:** When `showLogs && !isWideScreen`, render `LogsList` instead of the tabs + tab content. Hide `IssueTabs` and the tab content area.
- Remove the `activeTab.type === 'logs'` content branch.

```tsx
// In IssueDetail render:
<div className='flex h-full flex-col'>
  {/* Header */}
  <div className='flex items-center justify-between border-b p-2'>
    <div className='flex-1 px-1'>
      {/* ...title... */}
    </div>
    <div className='flex items-center gap-2'>
      {!isWideScreen && (
        <Button
          size='icon'
          variant={showLogs ? 'secondary' : 'ghost'}
          onClick={onToggleLogs}
        >
          <MessageSquare className='h-4 w-4' />
        </Button>
      )}
      {/* ...dropdown menu... */}
    </div>
  </div>

  {/* Tabs + Content (hidden when showLogs on narrow screen) */}
  {!(showLogs && !isWideScreen) && (
    <>
      <IssueTabs ... />
      <div className='flex-1 overflow-hidden'>
        {activeTab.type === 'tasks' && <TasksList ... />}
        {activeTab.type === 'note' && /* ...note view... */}
      </div>
    </>
  )}

  {/* Logs overlay for narrow screen */}
  {showLogs && !isWideScreen && (
    <div className='flex-1 overflow-hidden'>
      <LogsList ... />
    </div>
  )}
</div>
```

### 5. Fix `NoteView` `onDeleted` callback

**File:** `issue-detail.tsx`

- Currently `onDeleted` navigates to `{ type: 'logs' }`. Change to `{ type: 'tasks' }`.

### 6. Clean up

- Remove any remaining references to `activeTab.type === 'logs'` across the codebase.
- Verify `?tab=logs` in URL gracefully falls back to `tasks` (handled by updated `parseActiveTab`).

## Files Changed

| File                                          | Change                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/components/issues/issue-client-page.tsx` | Remove logs from ActiveTab, add showLogs state, always show side panel on wide screen |
| `src/components/issues/issue-tabs.tsx`        | Remove Logs tab button                                                                |
| `src/components/issues/issue-detail.tsx`      | Add log toggle button in header, conditional content rendering                        |

## Notes

- No API/backend changes needed.
- No DB schema changes needed.
- `useLogs` hook and `LogsList` component remain unchanged.
- The `ResizablePanel` component remains unchanged.
