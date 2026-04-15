'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUpdateNote } from '@/hooks/use-notes'
import type { Note } from 'naholo-api/types'

type RenameNoteDialogProps = {
  note: Note
  notes: Note[]
  projectSlug: string
  issueNumber: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onRenamed?: (newName: string) => void
}

export function RenameNoteDialog({
  note,
  notes,
  projectSlug,
  issueNumber,
  open,
  onOpenChange,
  onRenamed,
}: RenameNoteDialogProps) {
  const [name, setName] = useState(note.name)
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync: updateNote, isPending } = useUpdateNote(
    projectSlug,
    issueNumber,
  )

  const handleSubmit = async (e: React.FormEvent) => {
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
      onOpenChange(false)
      return
    }
    try {
      await updateNote({ noteName: note.name, newName: trimmed })
      onOpenChange(false)
      onRenamed?.(trimmed)
    } catch (error) {
      console.error('Failed to rename note:', error)
      setError('Failed to rename note')
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
          <DialogTitle>Rename note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <input
            type='text'
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            className='w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'
            autoFocus
          />
          {error != null && (
            <p className='mt-1 text-sm text-red-600'>{error}</p>
          )}
          <DialogFooter className='mt-4'>
            <Button
              type='button'
              variant='ghost'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
