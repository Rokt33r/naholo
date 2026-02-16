'use client'

import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type CreateTaskDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentTaskId: string | null
  onSubmit: (name: string) => Promise<void>
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  parentTaskId,
  onSubmit,
}: CreateTaskDialogProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [name])

  // Reset name when dialog opens
  useEffect(() => {
    if (open) {
      setName('')
    }
  }, [open])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!name.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(name.trim())
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl+Enter to submit
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isSubtask = parentTaskId !== null
  const title = isSubtask ? 'Add Subtask' : 'Add Task'
  const description = isSubtask ? 'Create a new subtask.' : 'Create a new task.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='task-name'>Name</Label>
              <textarea
                ref={textareaRef}
                id='task-name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Describe the task...'
                disabled={isSubmitting}
                autoFocus
                className='min-h-[80px] w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400'
              />
              <p className='text-xs text-zinc-500'>
                Press Cmd+Enter to create task
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
