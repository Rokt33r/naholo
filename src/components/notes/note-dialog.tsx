'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUpdateNote, useDeleteNote } from '@/hooks/use-notes'
import type { Note } from 'naholo-api/types'

type NoteDialogProps = {
  note: Note
  notes: Note[]
  projectSlug: string
  issueNumber: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onRenamed?: (newName: string) => void
  onDeleted?: () => void
}

export function NoteDialog({
  note,
  notes,
  projectSlug,
  issueNumber,
  open,
  onOpenChange,
  onRenamed,
  onDeleted,
}: NoteDialogProps) {
  const [name, setName] = useState(note.name)
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync: updateNote, isPending: isRenaming } = useUpdateNote(
    projectSlug,
    issueNumber,
  )
  const { mutateAsync: deleteNote, isPending: isDeleting } = useDeleteNote(
    projectSlug,
    issueNumber,
  )

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed === '') {
      setError('Name cannot be empty')
      return
    }
    if (
      trimmed !== note.name &&
      notes.some((n) => n.id !== note.id && n.name === trimmed)
    ) {
      setError('A note with this name already exists')
      return
    }
    if (trimmed === note.name) {
      return
    }
    try {
      await updateNote({ noteName: note.name, newName: trimmed })
      onRenamed?.(trimmed)
    } catch (error) {
      console.error('Failed to rename note:', error)
      setError('Failed to rename note')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return
    }
    try {
      await deleteNote(note.name)
      onOpenChange(false)
      onDeleted?.()
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName(note.name)
      setError(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Note settings</DialogTitle>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Rename section */}
          <form onSubmit={handleRename}>
            <label className='text-sm font-medium'>Name</label>
            <div className='mt-1 flex gap-2'>
              <input
                type='text'
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError(null)
                }}
                className='flex-1 rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'
                autoFocus
              />
              <Button
                type='submit'
                size='sm'
                disabled={isRenaming || isDeleting || name.trim() === note.name}
              >
                {isRenaming ? 'Renaming...' : 'Rename'}
              </Button>
            </div>
            {error != null && (
              <p className='mt-1 text-sm text-red-600'>{error}</p>
            )}
          </form>

          {/* Danger zone */}
          <div className='rounded-md border border-red-200 dark:border-red-900'>
            <div className='flex items-center justify-between px-4 py-3'>
              <div>
                <p className='text-sm font-medium'>Delete note</p>
                <p className='text-xs text-muted-foreground'>
                  This action cannot be undone.
                </p>
              </div>
              <Button
                variant='destructive'
                size='sm'
                onClick={handleDelete}
                disabled={isDeleting || isRenaming}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
