'use client'

import { useCallback, useState } from 'react'
import { Loader2, PenLine, Columns2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { NoteEditor } from '@/components/notes/note-editor'
import { NotePreview } from '@/components/notes/note-preview'
import type { Note } from 'naholo-api/types'

type ViewMode = 'editor' | 'split' | 'preview'

type NoteViewProps = {
  note: Note
  projectSlug: string
  operationNumber: number
  initialContent: string
  onContentChange: (value: string) => void
}

export function NoteView({
  note,
  initialContent,
  onContentChange,
}: NoteViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('editor')
  const [content, setContentState] = useState(initialContent)

  const isCreating = note.id.startsWith('temp-')

  const setContent = useCallback(
    (value: string) => {
      setContentState(value)
      onContentChange(value)
    },
    [onContentChange],
  )

  const handleEditorTripleClick = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      if (e.detail === 3) {
        setViewMode('preview')
      }
    },
    [],
  )

  const handlePreviewTripleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.detail === 3) {
        setViewMode('editor')
      }
    },
    [],
  )

  return (
    <div className='flex h-full flex-col'>
      {/* Content */}
      <div className='relative flex min-h-0 flex-1 overflow-hidden'>
        {/* Floating view-mode toggle */}
        {!isCreating && (
          <div className='absolute top-2 right-2 z-10'>
            <div className='rounded-md bg-background/80 p-1'>
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
            </div>
          </div>
        )}

        {isCreating ? (
          <div className='flex items-center gap-2 p-4 text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            Creating note...
          </div>
        ) : viewMode === 'editor' ? (
          <NoteEditor
            content={content}
            onContentChange={setContent}
            onClick={handleEditorTripleClick}
          />
        ) : viewMode === 'split' ? (
          <>
            <div className='flex w-1/2 flex-col overflow-hidden'>
              <NoteEditor
                content={content}
                onContentChange={setContent}
                onClick={handleEditorTripleClick}
              />
            </div>
            <div className='w-px bg-border' />
            <div className='flex w-1/2 flex-col overflow-hidden'>
              <NotePreview
                content={content}
                onClick={handlePreviewTripleClick}
              />
            </div>
          </>
        ) : (
          <NotePreview content={content} onClick={handlePreviewTripleClick} />
        )}
      </div>
    </div>
  )
}
