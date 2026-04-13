'use client'

import { useState } from 'react'
import { Plus, ListTodo, StickyNote, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu'
import { useCreateNote } from '@/hooks/use-notes'
import { RenameNoteDialog } from '@/components/notes/rename-note-dialog'
import type { DebouncedSaveState } from '@/hooks/use-issue-note-store'
import type { Note } from 'naholo-api/types'

type ActiveTab = { type: 'tasks' } | { type: 'note'; noteName: string }

type IssueTabsProps = {
  projectSlug: string
  issueNumber: number
  notes: Note[]
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
  notesSaveState?: Record<string, DebouncedSaveState>
}

function generateUniqueName(notes: Note[], base: string): string {
  const names = new Set(notes.map((n) => n.name))
  if (!names.has(base)) {
    return base
  }
  let i = 2
  while (names.has(`${base}-${i}`)) {
    i++
  }
  return `${base}-${i}`
}

export function IssueTabs({
  projectSlug,
  issueNumber,
  notes,
  activeTab,
  onTabChange,
  notesSaveState,
}: IssueTabsProps) {
  const [renamingNote, setRenamingNote] = useState<Note | null>(null)
  const { mutateAsync: createNote, isPending: isCreating } = useCreateNote(
    projectSlug,
    issueNumber,
  )

  const handleAddNote = async () => {
    try {
      const name = generateUniqueName(notes, 'untitled')
      const note = await createNote({
        name,
        content: '',
      })
      onTabChange({ type: 'note', noteName: note.name })
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  const handleRenamed = (newName: string) => {
    if (
      renamingNote != null &&
      activeTab.type === 'note' &&
      activeTab.noteName === renamingNote.name
    ) {
      onTabChange({ type: 'note', noteName: newName })
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
          activeTab.type === 'note' && activeTab.noteName === note.name
        const savingState = notesSaveState?.[note.id]
        const hasUnsavedChanges = savingState && savingState !== 'idle'
        return (
          <ContextMenu key={note.id}>
            <ContextMenuTrigger asChild>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                onClick={() =>
                  onTabChange({ type: 'note', noteName: note.name })
                }
                className={`max-w-[140px] truncate ${
                  !isActive && hasUnsavedChanges ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <StickyNote className='mr-1 h-4 w-4 shrink-0' />
                {note.name}
                {isActive && savingState === 'debouncing' && (
                  <Loader2 className='ml-1 h-3 w-3 shrink-0 animate-spin text-muted-foreground' />
                )}
                {isActive && savingState === 'saving' && (
                  <Loader2 className='ml-1 h-3 w-3 shrink-0 animate-spin text-blue-500' />
                )}
              </Button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onSelect={() => setRenamingNote(note)}>
                Rename
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
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

      {renamingNote != null && (
        <RenameNoteDialog
          note={renamingNote}
          notes={notes}
          projectSlug={projectSlug}
          issueNumber={issueNumber}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setRenamingNote(null)
            }
          }}
          onRenamed={handleRenamed}
        />
      )}
    </div>
  )
}
