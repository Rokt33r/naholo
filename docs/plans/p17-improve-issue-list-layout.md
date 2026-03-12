Renew issue layout

## Goal

Reorganize the header toolbar in `IssuesList` from a single crowded row into two semantically distinct rows:

- Row 1: Navigation/context controls (project context + panel toggle)
- Row 2: Issue-scoped actions (filter + create)

## Current Layout

```
[Project selector] [Open/Closed] [Sidebar] [New Issue]
[Search]
---
[Issue Item]
[Issue Item]
```

Current structure in `issues-list.tsx` (lines 66–103):

- Single `flex items-center justify-between` row
- Left: `ProjectSwitcher`
- Right: `ButtonGroup (Open/Closed)` + `Sidebar toggle` + `CreateIssueDialog`

## Expected Layout

```
[Project selector]         [Sidebar]
[Open/Closed]           [New Issue]
[Search]
---
[Issue Item]
[Issue Item]
```

## Implementation

**File:** `src/components/issues/issues-list.tsx`

Replace the single header row (lines 66–103) with two rows:

### Row 1 — Project + Sidebar

```tsx
<div className='flex items-center justify-between px-2 pt-3 pb-1'>
  <ProjectSwitcher ... />
  <Button size='icon' variant='ghost' className='size-8' onClick={toggle}>
    <PanelLeftClose className='h-4 w-4' />
  </Button>
</div>
```

### Row 2 — Filter + New Issue

```tsx
<div className='flex items-center justify-between px-2 pb-3'>
  <ButtonGroup>
    <Button
      size='sm'
      variant={filter === 'open' ? 'secondary' : 'ghost'}
      onClick={() => handleFilterChange('open')}
    >
      Open
    </Button>
    <Button
      size='sm'
      variant={filter === 'closed' ? 'secondary' : 'ghost'}
      onClick={() => handleFilterChange('closed')}
    >
      Closed
    </Button>
  </ButtonGroup>
  <CreateIssueDialog projectId={projectId} onIssueCreated={refetch}>
    <Button size='icon' variant='outline' className='size-8'>
      <SquarePen className='h-4 w-4' />
    </Button>
  </CreateIssueDialog>
</div>
```

Row 3 (Search) remains unchanged.

## Checklist

- [x] Split Row 1 into two rows in `issues-list.tsx`
- [x] Verify visual alignment at `w-80` panel width
- [x] Type-check with `npx tsc`
