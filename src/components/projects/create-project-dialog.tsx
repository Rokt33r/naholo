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
import { createProjectAction } from '@/app/app/actions'

type CreateProjectDialogProps = {
  children: React.ReactNode
}

export function CreateProjectDialog({ children }: CreateProjectDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const { execute: createProject, loading } = useAction(createProjectAction)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    const result = await createProject(
      name.trim(),
      description.trim() || undefined,
    )

    if (result.success) {
      setOpen(false)
      setName('')
      setDescription('')
      router.push(`/app/projects/${result.data.id}`)
    } else {
      alert('Failed to create project: ' + result.error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your notes and tasks.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='name'>Name *</Label>
              <Input
                id='name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='My Project'
                disabled={loading}
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='description'>Description</Label>
              <Input
                id='description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Optional description'
                disabled={loading}
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
            <Button type='submit' disabled={!name.trim() || loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
