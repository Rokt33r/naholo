'use client'

import { Plus, ListTodo, StickyNote, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCreateNote } from '@/hooks/use-notes'
import type { DebouncedSaveState } from '@/hooks/use-issue-note-store'
import type { Note } from 'naholo-api/types'

type ActiveTab = { type: 'tasks' } | { type: 'note'; noteId: string }

type IssueTabsProps = {
  projectId: string
  issueNumber: number
  notes: Note[]
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
  notesSaveState?: Record<string, DebouncedSaveState>
}

export function IssueTabs({
  projectId,
  issueNumber,
  notes,
  activeTab,
  onTabChange,
  notesSaveState,
}: IssueTabsProps) {
  const { mutateAsync: createNote, isPending: isCreating } = useCreateNote(
    projectId,
    issueNumber,
  )

  const handleAddNote = async () => {
    try {
      const note = await createNote({
        title: 'Untitled',
        content: '',
      })
      onTabChange({ type: 'note', noteId: note.id })
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  const isTasksActive = activeTab.type === 'tasks'

  return (
    <div className='flex items-center gap-1 border-b px-2 py-2'>
      <Button
        variant={isTasksActive ? 'secondary' : 'ghost'}
        onClick={() => onTabChange({ type: 'tasks' })}
      >
        <ListTodo className='mr-1 h-4 w-4' />
        Tasks
      </Button>
      {notes.map((note) => {
        const isActive =
          activeTab.type === 'note' && activeTab.noteId === note.id
        const savingState = notesSaveState?.[note.id]
        const hasUnsavedChanges = savingState && savingState !== 'idle'
        return (
          <Button
            key={note.id}
            variant={isActive ? 'secondary' : 'ghost'}
            onClick={() => onTabChange({ type: 'note', noteId: note.id })}
            className={`max-w-[140px] truncate ${
              !isActive && hasUnsavedChanges ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <StickyNote className='mr-1 h-4 w-4 shrink-0' />
            {note.title}
            {isActive && savingState === 'debouncing' && (
              <Loader2 className='ml-1 h-3 w-3 shrink-0 animate-spin text-muted-foreground' />
            )}
            {isActive && savingState === 'saving' && (
              <Loader2 className='ml-1 h-3 w-3 shrink-0 animate-spin text-blue-500' />
            )}
          </Button>
        )
      })}
      <Button
        variant='ghost'
        size='sm'
        onClick={handleAddNote}
        disabled={isCreating}
      >
        <Plus className='mr-1 h-4 w-4' />
        {isCreating ? 'Adding...' : 'Add Note'}
      </Button>
    </div>
  )
}
