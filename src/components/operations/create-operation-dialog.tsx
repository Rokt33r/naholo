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
import { useCreateOperation } from '@/hooks/use-operations'

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

  const createOperation = useCreateOperation(projectSlug)
  const isPending = createOperation.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      return
    }

    createOperation.mutate(
      { title: title.trim() },
      {
        onSuccess: (result) => {
          setOpen(false)
          setTitle('')
          onOperationCreated?.()
          router.push(
            `/app/projects/${projectSlug}/operations/${result.number}`,
          )
        },
      },
    )
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
                disabled={isPending}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={!title.trim() || isPending}>
              {isPending ? 'Creating...' : 'Create Operation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
