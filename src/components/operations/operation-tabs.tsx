'use client'

import { useState } from 'react'
import { Plus, FileText, Loader2, SatelliteDish, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu'
import { useCreateNote } from '@/hooks/use-notes'
import { NoteDialog } from '@/components/notes/note-dialog'
import type { DebouncedSaveState } from '@/hooks/use-operation-note-store'
import type { Note } from 'naholo-api/types'

type ActiveTab =
  | { type: 'comms' }
  | { type: 'stats' }
  | { type: 'note'; noteName: string }

type OperationTabsProps = {
  projectSlug: string
  operationNumber: number
  notes: Note[]
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
  notesSaveState?: Record<string, DebouncedSaveState>
  isWideScreen: boolean
  logsCount: number
  hasAgentTranscripts: boolean
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

export function OperationTabs({
  projectSlug,
  operationNumber,
  notes,
  activeTab,
  onTabChange,
  notesSaveState,
  isWideScreen,
  logsCount,
  hasAgentTranscripts,
}: OperationTabsProps) {
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const { mutateAsync: createNote, isPending: isCreating } = useCreateNote(
    projectSlug,
    operationNumber,
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
      editingNote != null &&
      activeTab.type === 'note' &&
      activeTab.noteName === editingNote.name
    ) {
      onTabChange({ type: 'note', noteName: newName })
    }
  }

  const handleDeleted = () => {
    if (
      editingNote != null &&
      activeTab.type === 'note' &&
      activeTab.noteName === editingNote.name
    ) {
      onTabChange({ type: 'comms' })
    }
  }

  const isCommsActive = activeTab.type === 'comms'
  const isStatsActive = activeTab.type === 'stats'

  return (
    <div className='flex flex-wrap items-center gap-x-1 gap-y-1 border-b px-2 py-1'>
      <Button
        variant={isCommsActive ? 'secondary' : 'ghost'}
        size='sm'
        onClick={() => onTabChange({ type: 'comms' })}
      >
        <SatelliteDish className='mr-1 size-4' />
        {!isWideScreen ? `Comms (${logsCount})` : 'Comms'}
      </Button>
      {hasAgentTranscripts && (
        <Button
          variant={isStatsActive ? 'secondary' : 'ghost'}
          size='sm'
          onClick={() => onTabChange({ type: 'stats' })}
        >
          <BarChart3 className='mr-1 size-4' />
          Stats
        </Button>
      )}
      {notes.map((note) => {
        const isActive =
          activeTab.type === 'note' && activeTab.noteName === note.name
        const savingState = notesSaveState?.[note.name]
        const hasUnsavedChanges = savingState && savingState !== 'idle'
        return (
          <ContextMenu
            key={note.id}
            onOpenChange={(open) => {
              if (open) {
                setEditingNote(note)
              }
            }}
          >
            <ContextMenuTrigger asChild>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                size='sm'
                onClick={() =>
                  onTabChange({ type: 'note', noteName: note.name })
                }
                onDoubleClick={(e) => {
                  e.preventDefault()
                  setEditingNote(note)
                }}
                className={`max-w-[200px] overflow-hidden ${
                  !isActive && hasUnsavedChanges ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <FileText className='mr-1 size-4 shrink-0' />
                <span className='truncate'>{note.name}</span>
                {isActive && savingState === 'saving' && (
                  <Loader2 className='ml-1 size-4 shrink-0 animate-spin text-blue-500' />
                )}
              </Button>
            </ContextMenuTrigger>
          </ContextMenu>
        )
      })}
      <Button
        variant='ghost'
        size='sm'
        onClick={handleAddNote}
        disabled={isCreating}
      >
        <Plus className='mr-1 size-4' />
        {isCreating ? 'Adding...' : 'Add Note'}
      </Button>

      {editingNote != null && (
        <NoteDialog
          note={editingNote}
          notes={notes}
          projectSlug={projectSlug}
          operationNumber={operationNumber}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setEditingNote(null)
            }
          }}
          onRenamed={handleRenamed}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
