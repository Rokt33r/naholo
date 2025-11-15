'use client'

import { useState } from 'react'
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
import { createTaskAction } from '@/app/app/actions'

type CreateTaskDialogProps = {
  projectId: string
  issueId: string
  parentTaskId?: string
  children: React.ReactNode
}

export function CreateTaskDialog({
  projectId,
  issueId,
  parentTaskId,
  children,
}: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')

  const { execute: createTask, loading } = useAction(createTaskAction)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      return
    }

    const result = await createTask(
      projectId,
      issueId,
      content.trim(),
      parentTaskId,
    )

    if (result.success) {
      setOpen(false)
      setContent('')
    } else {
      alert('Failed to create task: ' + result.error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {parentTaskId ? 'Create Subtask' : 'Create Task'}
            </DialogTitle>
            <DialogDescription>
              {parentTaskId
                ? 'Add a subtask to break down this task.'
                : 'Add a new task to this issue.'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='content'>Task *</Label>
              <Input
                id='content'
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder='Task description'
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
            <Button type='submit' disabled={!content.trim() || loading}>
              {loading
                ? 'Creating...'
                : parentTaskId
                  ? 'Create Subtask'
                  : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
