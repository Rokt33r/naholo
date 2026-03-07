# Collapsable Issues List

Make the issues list panel (middle column, 320px) collapsible to give more space to the issue detail view.

## Behavior

- **Collapse button**: Added next to the new issue button (SquarePen) in the issues list header. Uses `PanelLeftClose` icon.
- **Expand button**: Appears on the left side of the issue title in `issue-detail.tsx` header when the list is collapsed. Uses `PanelLeftOpen` icon.
- **State persistence**: Stored in `localStorage` via `useLocalStorage` hook (key: `'issues-list-collapsed'`, default: `false`).
- **Animation**: Smooth width transition using CSS `transition-all duration-200` on the issues list wrapper. Collapses from `w-80` to `w-0` with `overflow-hidden`.

## Files to Change

### 1. Create `IssuesListContext` — `src/components/issues/issues-list-context.tsx`

A small React context to share the collapsed state between the layout (where the issues list lives) and the issue detail view (which needs to show the expand button).

```tsx
'use client'
import { createContext, useContext } from 'react'
import { useLocalStorage } from '@/hooks/use-local-storage'

type IssuesListContextValue = {
  collapsed: boolean
  setCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void
  toggle: () => void
}

const IssuesListContext = createContext<IssuesListContextValue | null>(null)

export function IssuesListProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useLocalStorage(
    'issues-list-collapsed',
    false,
  )
  const toggle = () => setCollapsed((prev) => !prev)
  return (
    <IssuesListContext value={{ collapsed, setCollapsed, toggle }}>
      {children}
    </IssuesListContext>
  )
}

export function useIssuesList() {
  const ctx = useContext(IssuesListContext)
  if (!ctx)
    throw new Error('useIssuesList must be used within IssuesListProvider')
  return ctx
}
```

### 2. Update layout — `src/app/app/projects/[projectId]/layout.tsx`

- Wrap `QueryProvider` children with `<IssuesListProvider>`.
- Replace the static `w-80` wrapper div with a component that reads `collapsed` from context and applies `w-0` + `overflow-hidden` when collapsed, `w-80` when expanded, with `transition-all duration-200`.

```diff
+ import { IssuesListProvider } from '@/components/issues/issues-list-context'

  <QueryProvider>
+   <IssuesListProvider>
      <div className='flex h-screen w-full'>
        <ProjectSidebar ... />
-       <div className='flex w-80 flex-col border-r'>
+       <IssuesListPanel>        {/* new client component */}
          ...
-       </div>
+       </IssuesListPanel>
        <div className='flex-1 overflow-hidden'>{children}</div>
      </div>
+   </IssuesListProvider>
  </QueryProvider>
```

Create a small `IssuesListPanel` client component (can be in the same context file or inline) that reads the context:

```tsx
function IssuesListPanel({ children }: { children: React.ReactNode }) {
  const { collapsed } = useIssuesList()
  return (
    <div
      className={cn(
        'flex flex-col border-r transition-all duration-200',
        collapsed ? 'w-0 overflow-hidden' : 'w-80',
      )}
    >
      <div className='flex-1 overflow-hidden w-80'>{children}</div>
    </div>
  )
}
```

The inner `w-80` ensures content doesn't reflow during the width transition — the outer div clips it.

### 3. Add collapse button — `src/components/issues/issues-list.tsx`

Add a `PanelLeftClose` icon button next to the existing `SquarePen` create-issue button:

```diff
+ import { PanelLeftClose } from 'lucide-react'
+ import { useIssuesList } from './issues-list-context'

  // Inside component:
+ const { toggle } = useIssuesList()

  <div className='flex items-center gap-2'>
    <ButtonGroup>...</ButtonGroup>
    <CreateIssueDialog ...>
      <Button size='icon' variant='outline' className='size-8'>
        <SquarePen className='h-4 w-4' />
      </Button>
    </CreateIssueDialog>
+   <Button size='icon' variant='ghost' className='size-8' onClick={toggle}>
+     <PanelLeftClose className='h-4 w-4' />
+   </Button>
  </div>
```

### 4. Add expand button — `src/components/issues/issue-detail.tsx`

Show a `PanelLeftOpen` button on the left side of the issue title when the list is collapsed:

```diff
+ import { PanelLeftOpen } from 'lucide-react'
+ import { useIssuesList } from './issues-list-context'

  // Inside component:
+ const { collapsed, toggle } = useIssuesList()

  {/* Header */}
  <div className='flex items-center justify-between border-b p-2'>
+   {collapsed && (
+     <Button size='icon' variant='ghost' onClick={toggle}>
+       <PanelLeftOpen className='h-4 w-4' />
+     </Button>
+   )}
    <div className='flex-1 px-1'>
      ...issue title...
    </div>
  </div>
```

## Summary of Changes

| File                                            | Change                                                |
| ----------------------------------------------- | ----------------------------------------------------- |
| `src/components/issues/issues-list-context.tsx` | **New** — context provider + hook                     |
| `src/app/app/projects/[projectId]/layout.tsx`   | Wrap with `IssuesListProvider`, use `IssuesListPanel` |
| `src/components/issues/issues-list.tsx`         | Add `PanelLeftClose` collapse button                  |
| `src/components/issues/issue-detail.tsx`        | Add `PanelLeftOpen` expand button (conditional)       |
