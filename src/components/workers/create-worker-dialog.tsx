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
import { useCreateWorker } from '@/hooks/use-workers'

type CreateWorkerDialogProps = {
  projectSlug: string
  children: React.ReactNode
  onWorkerCreated?: () => void
}

export function CreateWorkerDialog({
  projectSlug,
  children,
  onWorkerCreated,
}: CreateWorkerDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const createWorker = useCreateWorker(projectSlug)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    const result = await createWorker.mutateAsync(name.trim())
    setOpen(false)
    setName('')
    onWorkerCreated?.()
    router.push(`/app/projects/${projectSlug}/workers/${result.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Worker</DialogTitle>
            <DialogDescription>
              Create a new bot worker for this project.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='worker-name'>Name *</Label>
              <Input
                id='worker-name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Worker name'
                disabled={createWorker.isPending}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={createWorker.isPending}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={!name.trim() || createWorker.isPending}
            >
              {createWorker.isPending ? 'Creating...' : 'Create Worker'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
