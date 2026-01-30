'use client'

import { useState } from 'react'
import { MoreVertical, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateNote, useDeleteNote } from '@/hooks/use-notes'

type Note = {
  id: string
  title: string
  content: string
  position: number
  createdAt: Date
  updatedAt: Date
}

type NoteViewProps = {
  note: Note
  projectId: string
  issueId: string
  onDeleted?: () => void
}

export function NoteView({
  note,
  projectId,
  issueId,
  onDeleted,
}: NoteViewProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)

  const { mutateAsync: updateNote, isPending: updateLoading } = useUpdateNote(
    projectId,
    issueId,
  )
  const { mutateAsync: deleteNote, isPending: deleteLoading } = useDeleteNote(
    projectId,
    issueId,
  )

  const isCreating = note.id.startsWith('temp-')
  const isLoading = updateLoading || deleteLoading

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

  const handleSaveContent = async () => {
    if (content !== note.content) {
      try {
        await updateNote({
          noteId: note.id,
          title: note.title,
          content: content.trim(),
        })
      } catch (error) {
        console.error('Failed to update note content:', error)
        setContent(note.content)
      }
    }
    setIsEditingContent(false)
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

  const handleContentKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSaveContent()
    } else if (e.key === 'Escape') {
      setContent(note.content)
      setIsEditingContent(false)
    }
  }

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
              {updateLoading && (
                <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
              )}
            </div>
          )}
        </div>
        {!isCreating && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size='icon' variant='ghost' disabled={isLoading}>
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

      {/* Content */}
      <div className='flex-1 overflow-y-auto p-4'>
        {isCreating ? (
          <div className='flex items-center gap-2 text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            Creating note...
          </div>
        ) : isEditingContent ? (
          <div className='h-full'>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleContentKeyDown}
              className='min-h-[200px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400'
              placeholder='Write your note content here... (Markdown supported)'
              autoFocus
            />
            <div className='mt-2 flex gap-2'>
              <Button
                size='sm'
                onClick={handleSaveContent}
                disabled={updateLoading}
              >
                {updateLoading ? 'Saving...' : 'Save (Cmd+Enter)'}
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  setContent(note.content)
                  setIsEditingContent(false)
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            className='prose prose-sm dark:prose-invert max-w-none cursor-text'
            onClick={() => setIsEditingContent(true)}
          >
            {note.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {note.content}
              </ReactMarkdown>
            ) : (
              <p className='text-muted-foreground'>Click to add content...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
