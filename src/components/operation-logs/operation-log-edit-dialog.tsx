'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import {
  useUpdateOperationLog,
  type OperationLog,
} from '@/hooks/use-operation-logs'

type OperationLogEditDialogProps = {
  log: OperationLog
  projectSlug: string
  operationNumber: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OperationLogEditDialog({
  log,
  projectSlug,
  operationNumber,
  open,
  onOpenChange,
}: OperationLogEditDialogProps) {
  const [content, setContent] = useState(log.content)
  const { mutateAsync: updateLog, isPending } = useUpdateOperationLog(
    projectSlug,
    operationNumber,
  )

  useEffect(() => {
    if (open) {
      setContent(log.content)
    }
  }, [open, log.content])

  const handleOpenChange = (next: boolean) => {
    if (!next && content.trim() !== log.content) {
      if (!confirm('Discard changes? Your edits will be lost.')) {
        return
      }
    }
    onOpenChange(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || trimmed === log.content) {
      onOpenChange(false)
      return
    }
    try {
      await updateLog({ logId: log.id, content: trimmed })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update log:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='flex max-h-[85dvh] flex-col'>
        <form
          onSubmit={handleSubmit}
          className='flex min-h-0 flex-1 flex-col gap-4'
        >
          <DialogHeader>
            <DialogTitle>Edit log</DialogTitle>
          </DialogHeader>
          <div className='min-h-0 flex-1 overflow-y-auto rounded-lg border bg-card focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]'>
            <AutoResizeTextarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className='w-full resize-none bg-transparent p-2 text-sm outline-none'
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isPending || !content.trim()}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
