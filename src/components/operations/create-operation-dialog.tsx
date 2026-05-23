'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAction } from '@/lib/use-action'
import { createOperationAction } from '@/app/app/actions'

type CreateOperationDialogProps = {
  projectSlug: string
  children: React.ReactNode
  onOperationCreated?: () => void
}

export function CreateOperationDialog({
  projectSlug,
  children,
  onOperationCreated,
}: CreateOperationDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')

  const { execute: createOperation, loading } = useAction(createOperationAction)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      return
    }

    const result = await createOperation(projectSlug, title.trim())

    if (result.success) {
      setOpen(false)
      setTitle('')
      onOperationCreated?.()
      router.push(
        `/app/projects/${projectSlug}/operations/${result.data.number}`,
      )
    } else {
      alert('Failed to create operation: ' + result.error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Operation</DialogTitle>
            <DialogDescription>
              Create a new operation to track discussions and tasks.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='title'>Title *</Label>
              <Input
                id='title'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='Operation title'
                disabled={loading}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={!title.trim() || loading}>
              {loading ? 'Creating...' : 'Create Operation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
