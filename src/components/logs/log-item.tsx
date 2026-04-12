'use client'

import { useState, useRef, useCallback } from 'react'
import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownView } from '@/components/ui/markdown-view'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateLog, useDeleteLog, type Log } from '@/hooks/use-logs'
import { cn } from '@/lib/utils'

type LogItemProps = {
  log: Log
  projectSlug: string
  issueNumber: number
  isOwn: boolean
}

export function LogItem({
  log,
  projectSlug,
  issueNumber,
  isOwn,
}: LogItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(log.content)
  const skipBlurSave = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { mutateAsync: updateLog, isPending: updateLoading } = useUpdateLog(
    projectSlug,
    issueNumber,
  )
  const { mutateAsync: deleteLog, isPending: deleteLoading } = useDeleteLog(
    projectSlug,
    issueNumber,
  )

  const isCreating = log.id.startsWith('temp-')
  const isLoading = updateLoading || deleteLoading
  const isBot = log.projectWorker?.type === 'bot'
  const isReadOnly = !isOwn || isBot

  const handleEdit = () => {
    setContent(log.content)
    setIsEditing(true)
  }

  const handleSave = useCallback(async () => {
    const trimmed = content.trim()
    if (!trimmed || trimmed === log.content) {
      setContent(log.content)
      setIsEditing(false)
      return
    }
    try {
      await updateLog({ logId: log.id, content: trimmed })
    } catch (error) {
      console.error('Failed to update log:', error)
      setContent(log.content)
    }
    setIsEditing(false)
  }, [content, log.content, log.id, updateLog])

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

  const handleCancel = useCallback(() => {
    if (content.trim() !== log.content) {
      skipBlurSave.current = true
      const discard = confirm('Discard changes? Your edits will be lost.')
      if (!discard) {
        skipBlurSave.current = false
        textareaRef.current?.focus()
        return
      }
    }
    setContent(log.content)
    setIsEditing(false)
  }, [content, log.content])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const handleBlur = useCallback(() => {
    if (skipBlurSave.current) {
      skipBlurSave.current = false
      return
    }
    handleSave()
  }, [handleSave])

  return (
    <div
      className={cn(
        'group flex items-baseline-last',
        isOwn ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {isEditing ? (
        <div className='w-full'>
          <AutoResizeTextarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className='w-full resize-none rounded-lg border bg-card p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
            autoFocus
          />
        </div>
      ) : (
        <div>
          {!isOwn && log.projectWorker?.name && (
            <div className='mb-0.5 text-xs text-muted-foreground'>
              {log.projectWorker.name}
            </div>
          )}
          <div
            onDoubleClick={isCreating || isReadOnly ? undefined : handleEdit}
            className={cn(
              'inline-block rounded-lg border p-2',
              isOwn ? 'bg-card' : 'bg-muted/50',
              !isCreating && !isReadOnly && 'cursor-text hover:bg-accent/50',
              isCreating && 'opacity-70',
            )}
          >
            <MarkdownView className='max-w-160'>{log.content}</MarkdownView>
          </div>
          {isCreating && (
            <div className='mt-1 text-xs text-muted-foreground'>Sending...</div>
          )}
        </div>
      )}
      {!isCreating && !isReadOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 opacity-0 group-hover:opacity-100'
              disabled={isLoading}
            >
              <MoreVertical className='h-3 w-3' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={handleEdit} disabled={isLoading}>
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
      )}
    </div>
  )
}
