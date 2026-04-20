'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  MoreVertical,
  Loader2,
  CircleDot,
  CircleCheck,
  PanelLeftOpen,
  ListTodo,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OperationLogsList } from '@/components/operation-logs/operation-logs-list'
import type { OperationLog } from '@/hooks/use-operation-logs'
import { ObjectivesList } from '@/components/objectives/objectives-list'
import { NoteView } from '@/components/notes/note-view'
import { useOperationsList } from './operations-list-context'
import { OperationTabs } from './operation-tabs'
import {
  useOperation,
  useUpdateOperationTitle,
  useDeleteOperation,
} from '@/hooks/use-operations'
import { useUpdateNote } from '@/hooks/use-notes'
import { useOperationNoteStore } from '@/hooks/use-operation-note-store'
import type { Note } from 'naholo-api/types'

type ActiveTab = { type: 'comms' } | { type: 'note'; noteName: string }

type OperationDetailProps = {
  projectSlug: string
  operationNumber: number
  operationLogs: OperationLog[]
  notes: Note[]
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
  isWideScreen: boolean
  isMobile: boolean
  objectivesCount: number
}

export function OperationDetail({
  projectSlug,
  operationNumber,
  operationLogs,
  notes,
  activeTab,
  onTabChange,
  isWideScreen,
  isMobile,
  objectivesCount,
}: OperationDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { collapsed, toggle: toggleOperationsList } = useOperationsList()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showObjectivesDialog, setShowObjectivesDialog] = useState(false)

  const { operation, isLoading } = useOperation(projectSlug, operationNumber)
  const { mutateAsync: updateTitle } = useUpdateOperationTitle(
    projectSlug,
    operationNumber,
  )
  const { mutateAsync: deleteOperation } = useDeleteOperation(
    projectSlug,
    operationNumber,
  )
  const { mutateAsync: updateNote } = useUpdateNote(
    projectSlug,
    operationNumber,
  )

  const handleNoteSave = useCallback(
    async (noteName: string, content: string) => {
      const note = notes.find((n) => n.name === noteName)
      if (!note || note.id.startsWith('temp-')) {
        return
      }
      await updateNote({ noteName, content }).catch((error: unknown) => {
        console.error('Failed to auto-save note content:', error)
      })
    },
    [notes, updateNote],
  )

  const store = useOperationNoteStore({
    operationId: operation?.id ?? '',
    onSave: handleNoteSave,
  })

  // Initialize store entries when notes load
  useEffect(() => {
    notes.forEach((n) => store.initNote(n.name, n.content))
  }, [notes, store.initNote])

  const handleTabChange = useCallback(
    (newTab: ActiveTab) => {
      if (activeTab.type === 'note') {
        const note = notes.find((n) => n.name === activeTab.noteName)
        if (note != null) {
          store.flush(note.name)
        }
      }
      onTabChange(newTab)
    },
    [activeTab, notes, store.flush, onTabChange],
  )

  // Sync title with fetched operation
  if (operation && title !== operation.title && !isEditingTitle) {
    setTitle(operation.title)
  }

  const handleDeleteOperation = async () => {
    if (!operation) return
    if (!confirm('Are you sure you want to delete this operation?')) {
      return
    }
    setIsDeleting(true)
    try {
      await deleteOperation()
      const query = searchParams.toString()
      router.push(`/app/projects/${projectSlug}${query ? `?${query}` : ''}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTitleSave = async () => {
    if (!operation || !title.trim() || title === operation.title) {
      setIsEditingTitle(false)
      return
    }

    setIsSaving(true)
    try {
      await updateTitle(title.trim())
    } catch (error) {
      // Error is already toasted by the hook
      setTitle(operation.title)
    } finally {
      setIsSaving(false)
      setIsEditingTitle(false)
    }
  }

  if (isLoading || !operation) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between pt-2 px-2'>
        {isMobile ? (
          <Button
            size='icon'
            variant='ghost'
            onClick={() => {
              const query = searchParams.toString()
              router.push(
                `/app/projects/${projectSlug}${query ? `?${query}` : ''}`,
              )
            }}
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
        ) : (
          collapsed && (
            <Button size='icon' variant='ghost' onClick={toggleOperationsList}>
              <PanelLeftOpen className='h-4 w-4' />
            </Button>
          )
        )}
        <div className='flex-1 px-1'>
          {isEditingTitle ? (
            <input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTitleSave()
                } else if (e.key === 'Escape') {
                  setTitle(operation.title)
                  setIsEditingTitle(false)
                }
              }}
              className='w-full bg-transparent text-xl font-semibold outline-none'
              autoFocus
            />
          ) : (
            <div className='flex items-center gap-2'>
              {operation.closed ? (
                <CircleCheck className='h-5 w-5 shrink-0 text-purple-600' />
              ) : (
                <CircleDot className='h-5 w-5 shrink-0 text-green-600' />
              )}
              <h1
                className='cursor-text text-xl font-semibold'
                onClick={() => setIsEditingTitle(true)}
              >
                {operation.title}{' '}
                <span className='text-muted-foreground font-normal'>
                  #{operation.number}
                </span>
              </h1>
              {isSaving && (
                <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
              )}
            </div>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {!isWideScreen && (
            <Button
              size='sm'
              variant={showObjectivesDialog ? 'secondary' : 'ghost'}
              onClick={() => setShowObjectivesDialog(!showObjectivesDialog)}
            >
              <ListTodo className='mr-1 h-4 w-4' />
              Objectives ({objectivesCount})
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size='icon' variant='ghost' disabled={isDeleting}>
                <MoreVertical className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onClick={handleDeleteOperation}
                className='text-red-600'
              >
                {isDeleting ? 'Deleting...' : 'Delete operation'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <OperationTabs
        projectSlug={projectSlug}
        operationNumber={operation.number}
        notes={notes}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        notesSaveState={store.saveStates}
        isWideScreen={isWideScreen}
        logsCount={operationLogs.length}
      />

      {/* Content */}
      <div className='flex-1 overflow-hidden'>
        {activeTab.type === 'comms' && (
          <OperationLogsList
            projectSlug={projectSlug}
            operationNumber={operation.number}
            operationLogs={operationLogs}
            isClosed={operation.closed}
          />
        )}
        {activeTab.type === 'note' &&
          (() => {
            const note = notes.find((n) => n.name === activeTab.noteName)
            if (!note) {
              return (
                <div className='flex h-full items-center justify-center text-muted-foreground'>
                  Note not found
                </div>
              )
            }
            return (
              <NoteView
                key={note.id}
                note={note}
                projectSlug={projectSlug}
                operationNumber={operation.number}
                initialContent={store.getContent(note.name) ?? note.content}
                saveState={store.saveStates[note.name] ?? 'idle'}
                onContentChange={(value) => store.setContent(note.name, value)}
              />
            )
          })()}
      </div>

      {/* Mobile objectives dialog */}
      {!isWideScreen && (
        <Dialog
          open={showObjectivesDialog}
          onOpenChange={setShowObjectivesDialog}
        >
          <DialogContent
            className='flex h-[80vh] max-w-lg flex-col p-0'
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <DialogHeader className='px-4 pt-4'>
              <DialogTitle className='flex items-center gap-1.5'>
                <ListTodo className='h-4 w-4' />
                Objectives ({objectivesCount})
              </DialogTitle>
            </DialogHeader>
            <div className='flex-1 overflow-hidden'>
              <ObjectivesList
                projectSlug={projectSlug}
                operationNumber={operation.number}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
