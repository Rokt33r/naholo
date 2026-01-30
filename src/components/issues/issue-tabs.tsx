'use client'

import { Plus, MessageSquare, ListTodo, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCreateNote } from '@/hooks/use-notes'

type Note = {
  id: string
  title: string
  content: string
  position: number
  createdAt: Date
  updatedAt: Date
}

type ActiveTab =
  | { type: 'logs' }
  | { type: 'tasks' }
  | { type: 'note'; noteId: string }

type IssueTabsProps = {
  projectId: string
  issueId: string
  notes: Note[]
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
}

export function IssueTabs({
  projectId,
  issueId,
  notes,
  activeTab,
  onTabChange,
}: IssueTabsProps) {
  const { mutateAsync: createNote, isPending: isCreating } = useCreateNote(
    projectId,
    issueId,
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

  const isLogsActive = activeTab.type === 'logs'
  const isTasksActive = activeTab.type === 'tasks'

  return (
    <div className='flex items-center gap-1 border-b px-2 py-1'>
      <Button
        variant={isLogsActive ? 'secondary' : 'ghost'}
        size='sm'
        onClick={() => onTabChange({ type: 'logs' })}
      >
        <MessageSquare className='mr-1 h-4 w-4' />
        Logs
      </Button>
      <Button
        variant={isTasksActive ? 'secondary' : 'ghost'}
        size='sm'
        onClick={() => onTabChange({ type: 'tasks' })}
      >
        <ListTodo className='mr-1 h-4 w-4' />
        Tasks
      </Button>
      {notes.map((note) => {
        const isActive =
          activeTab.type === 'note' && activeTab.noteId === note.id
        return (
          <Button
            key={note.id}
            variant={isActive ? 'secondary' : 'ghost'}
            size='sm'
            onClick={() => onTabChange({ type: 'note', noteId: note.id })}
            className='max-w-[120px] truncate'
          >
            <StickyNote className='mr-1 h-4 w-4 shrink-0' />
            {note.title}
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
