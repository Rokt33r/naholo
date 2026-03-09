'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MoreVertical, Loader2, PenLine, Columns2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { MarkdownView } from '@/components/ui/markdown-view'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateNote, useDeleteNote } from '@/hooks/use-notes'
import {
  useDebouncedSave,
  type DebouncedSaveState,
} from '@/hooks/use-debounced-save'

type Note = {
  id: string
  title: string
  content: string
  position: number
  createdAt: Date
  updatedAt: Date
}

type ViewMode = 'editor' | 'split' | 'preview'

type NoteViewProps = {
  note: Note
  projectId: string
  issueId: string
  onDeleted?: () => void
  onSaveStateChange?: (noteId: string, state: DebouncedSaveState) => void
}

export function NoteView({
  note,
  projectId,
  issueId,
  onDeleted,
  onSaveStateChange,
}: NoteViewProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [title, setTitle] = useState(note.title)
  const [viewMode, setViewMode] = useState<ViewMode>('editor')

  const { mutateAsync: updateNote, isPending: updateLoading } = useUpdateNote(
    projectId,
    issueId,
  )
  const { mutateAsync: deleteNote, isPending: deleteLoading } = useDeleteNote(
    projectId,
    issueId,
  )

  const isCreating = note.id.startsWith('temp-')

  const handleContentSave = useCallback(
    async (contentToSave: string) => {
      if (isCreating) return
      await updateNote({
        noteId: note.id,
        title: note.title,
        content: contentToSave,
      }).catch((error: unknown) => {
        console.error('Failed to auto-save note content:', error)
      })
    },
    [isCreating, note.id, note.title, updateNote],
  )

  const { content, setContent, saveState } = useDebouncedSave({
    noteId: note.id,
    initialContent: note.content,
    onSave: handleContentSave,
  })

  // Report save state changes to parent
  useEffect(() => {
    onSaveStateChange?.(note.id, saveState)
  }, [note.id, saveState, onSaveStateChange])

  // Clear old tab's spinner when switching notes
  const prevNoteIdRef = useRef(note.id)
  useEffect(() => {
    if (prevNoteIdRef.current !== note.id) {
      onSaveStateChange?.(prevNoteIdRef.current, 'idle')
      prevNoteIdRef.current = note.id
    }
  }, [note.id, onSaveStateChange])

  // Reset title when switching notes
  useEffect(() => {
    setTitle(note.title)
  }, [note.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const isSavingContent = saveState !== 'idle'
  const isLoading = updateLoading || deleteLoading || isSavingContent

  const handleSaveTitle = async () => {
    if (title.trim() && title !== note.title) {
      try {
        await updateNote({
          noteId: note.id,
          title: title.trim(),
          content: note.content,
        })
      } catch (error) {
        console.error('Failed to update note title:', error)
        setTitle(note.title)
      }
    } else {
      setTitle(note.title)
    }
    setIsEditingTitle(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return
    }
    try {
      await deleteNote(note.id)
      onDeleted?.()
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      setTitle(note.title)
      setIsEditingTitle(false)
    }
  }

  const handleEditorDoubleClick = () => {
    setViewMode('preview')
  }

  const handlePreviewDoubleClick = () => {
    setViewMode('editor')
  }

  const renderEditor = (onDoubleClick?: () => void) => (
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      onDoubleClick={onDoubleClick}
      className='h-full w-full flex-1 resize-none bg-transparent px-4 py-3 font-mono text-sm outline-none'
      placeholder='Write your note content here... (Markdown supported)'
    />
  )

  const renderPreview = (onDoubleClick?: () => void) => (
    <div
      className='h-full flex-1 cursor-text overflow-y-auto px-4 py-3'
      onDoubleClick={onDoubleClick}
    >
      {content ? (
        <MarkdownView>{content}</MarkdownView>
      ) : (
        <p className='text-muted-foreground'>No content yet...</p>
      )}
    </div>
  )

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b p-2'>
        <div className='flex-1 px-1'>
          {isEditingTitle ? (
            <input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleTitleKeyDown}
              className='w-full bg-transparent text-lg font-semibold outline-none'
              autoFocus
            />
          ) : (
            <div className='flex items-center gap-2'>
              <h2
                className='cursor-text text-lg font-semibold'
                onClick={() => !isCreating && setIsEditingTitle(true)}
              >
                {note.title}
              </h2>
            </div>
          )}
        </div>

        <div className='flex items-center gap-1'>
          {/* View mode toggle */}
          {!isCreating && (
            <ButtonGroup>
              <Button
                size='icon-sm'
                variant={viewMode === 'editor' ? 'secondary' : 'ghost'}
                onClick={() => setViewMode('editor')}
                title='Editor'
              >
                <PenLine />
              </Button>
              <Button
                size='icon-sm'
                variant={viewMode === 'split' ? 'secondary' : 'ghost'}
                onClick={() => setViewMode('split')}
                title='Split'
              >
                <Columns2 />
              </Button>
              <Button
                size='icon-sm'
                variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                onClick={() => setViewMode('preview')}
                title='Preview'
              >
                <Eye />
              </Button>
            </ButtonGroup>
          )}

          {/* Actions menu */}
          {!isCreating && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size='icon-sm' variant='ghost' disabled={isLoading}>
                  <MoreVertical className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className='text-red-600'
                >
                  {deleteLoading ? 'Deleting...' : 'Delete note'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Content */}
      <div className='flex min-h-0 flex-1 overflow-hidden'>
        {isCreating ? (
          <div className='flex items-center gap-2 p-4 text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            Creating note...
          </div>
        ) : viewMode === 'editor' ? (
          renderEditor(handleEditorDoubleClick)
        ) : viewMode === 'split' ? (
          <>
            <div className='flex w-1/2 flex-col overflow-hidden'>
              {renderEditor(handleEditorDoubleClick)}
            </div>
            <div className='w-px bg-border' />
            <div className='flex w-1/2 flex-col overflow-hidden'>
              {renderPreview(handlePreviewDoubleClick)}
            </div>
          </>
        ) : (
          renderPreview(handlePreviewDoubleClick)
        )}
      </div>
    </div>
  )
}
