'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

type Issue = {
  id: string
  title: string
  closed: boolean
  closedAt: Date | null
  updatedAt: Date
}

type IssueItemProps = {
  issue: Issue
  projectId: string
  isActive: boolean
}

export function IssueItem({ issue, projectId, isActive }: IssueItemProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/app/projects/${projectId}/issues/${issue.id}`)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full px-4 py-3 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800',
        isActive && 'bg-zinc-100 dark:bg-zinc-800',
      )}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='flex-1 overflow-hidden'>
          <div className='truncate font-medium'>{issue.title}</div>
          <div className='mt-1 text-xs text-zinc-500'>
            {formatDistanceToNow(new Date(issue.updatedAt), {
              addSuffix: true,
            })}
          </div>
        </div>
        {issue.closed && (
          <span className='rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'>
            Closed
          </span>
        )}
      </div>
    </button>
  )
}
