'use client'

import { useState } from 'react'
import { Loader2, PenLine, Columns2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { MarkdownView } from '@/components/ui/markdown-view'
import type { DebouncedSaveState } from '@/hooks/use-operation-note-store'
import type { Note } from 'naholo-api/types'

type ViewMode = 'editor' | 'split' | 'preview'

type NoteViewProps = {
  note: Note
  projectSlug: string
  operationNumber: number
  initialContent: string
  saveState: DebouncedSaveState
  onContentChange: (value: string) => void
}

export function NoteView({
  note,
  initialContent,
  saveState,
  onContentChange,
}: NoteViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('editor')
  const [content, setContentState] = useState(initialContent)

  const isCreating = note.id.startsWith('temp-')

  const setContent = (value: string) => {
    setContentState(value)
    onContentChange(value)
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
