'use client'

import { useState } from 'react'
import { MoreVertical } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateLog, useDeleteLog } from '@/hooks/use-logs'

type Log = {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
}

type LogItemProps = {
  log: Log
  projectId: string
  issueId: string
}

export function LogItem({ log, projectId, issueId }: LogItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(log.content)

  const { mutateAsync: updateLog, isPending: updateLoading } = useUpdateLog(
    projectId,
    issueId,
  )
  const { mutateAsync: deleteLog, isPending: deleteLoading } = useDeleteLog(
    projectId,
    issueId,
  )

  const isLoading = updateLoading || deleteLoading

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (content.trim() && content !== log.content) {
      try {
        await updateLog({ logId: log.id, content: content.trim() })
      } catch (error) {
        console.error('Failed to update log:', error)
        setContent(log.content)
      }
    }
    setIsEditing(false)
  }

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave()
    } else if (e.key === 'Escape') {
      setContent(log.content)
      setIsEditing(false)
    }
  }

  return (
    <div className='group flex flex-row-reverse items-baseline-last'>
      {isEditing ? (
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className='min-h-[100px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400'
            autoFocus
          />
          <div className='mt-2 flex gap-2'>
            <Button size='sm' onClick={handleSave} disabled={updateLoading}>
              {updateLoading ? 'Saving...' : 'Save (Cmd+Enter)'}
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setContent(log.content)
                setIsEditing(false)
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className='prose prose-sm dark:prose-invert max-w-160 inline-block rounded-lg border bg-card p-2 hover:bg-accent/50'>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {log.content}
          </ReactMarkdown>
        </div>
      )}
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
    </div>
  )
}
