'use client'

import { useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownView } from '@/components/ui/markdown-view'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useDeleteOperationLog,
  type OperationLog,
} from '@/hooks/use-operation-logs'
import { cn } from '@/lib/utils'
import { OperationLogEditDialog } from './operation-log-edit-dialog'

type OperationLogItemProps = {
  log: OperationLog
  projectSlug: string
  operationNumber: number
  isOwn: boolean
}

export function OperationLogItem({
  log,
  projectSlug,
  operationNumber,
  isOwn,
}: OperationLogItemProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)

  const { mutateAsync: deleteLog, isPending: deleteLoading } =
    useDeleteOperationLog(projectSlug, operationNumber)

  const isCreating = log.id.startsWith('temp-')
  const isReadOnly = !isOwn

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this log?')) {
      return
    }
    try {
      await deleteLog(log.id)
    } catch (error) {
      console.error('Failed to delete log:', error)
    }
  }

  return (
    <div
      className={cn(
        'group flex items-baseline-last',
        isOwn ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <div className='min-w-0'>
        {!isOwn && log.projectOperator?.name && (
          <div className='mb-0.5 text-xs text-muted-foreground'>
            {log.projectOperator.name}
          </div>
        )}
        <div
          onClick={
            isCreating || isReadOnly
              ? undefined
              : (e) => {
                  if (e.detail === 3) {
                    setIsEditOpen(true)
                  }
                }
          }
          className={cn(
            'inline-block max-w-full rounded-lg border p-2',
            isOwn ? 'bg-card' : 'bg-muted/50',
            !isCreating && !isReadOnly && 'cursor-text hover:bg-accent/50',
            isCreating && 'opacity-70',
          )}
        >
          <MarkdownView>{log.content}</MarkdownView>
        </div>
        {isCreating && (
          <div className='mt-1 text-xs text-muted-foreground'>Sending...</div>
        )}
      </div>
      {!isCreating && !isReadOnly && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='size-7 opacity-0 group-hover:opacity-100'
                disabled={deleteLoading}
              >
                <MoreVertical className='size-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onClick={() => setIsEditOpen(true)}
                disabled={deleteLoading}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={deleteLoading}
                className='text-red-600'
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <OperationLogEditDialog
            log={log}
            projectSlug={projectSlug}
            operationNumber={operationNumber}
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
          />
        </>
      )}
    </div>
  )
}
