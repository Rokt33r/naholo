'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CircleCheckBig, CircleDot, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatIssueDate } from '@/lib/date-utils'

type Issue = {
  id: string
  title: string
  lastLogPreview: string | null
  closed: boolean
  closedAt: Date | null
  updatedAt: Date
  totalTasks: number
  completedTasks: string | null
}

type IssueItemProps = {
  issue: Issue
  projectId: string
  isActive: boolean
}

export function IssueItem({ issue, projectId, isActive }: IssueItemProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleClick = () => {
    const query = searchParams.toString()
    router.push(
      `/app/projects/${projectId}/issues/${issue.id}${query ? `?${query}` : ''}`,
    )
  }

  const completedCount = issue.completedTasks
    ? parseInt(issue.completedTasks, 10)
    : 0
  const totalCount = issue.totalTasks || 0

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full px-3 py-3 text-left transition-colors hover:bg-ring rounded-md',
        isActive && 'bg-accent hover:bg-accent',
      )}
    >
      {/* Row 1: Title and progress */}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1 flex-1 min-w-0'>
          {issue.closed ? (
            <CircleCheck className='h-4 w-4 shrink-0 text-purple-600' />
          ) : (
            <CircleDot className='h-4 w-4 shrink-0 text-green-600' />
          )}
          <div className='truncate font-bold'>{issue.title}</div>
        </div>
        {totalCount > 0 && (
          <div className='flex items-center gap-1 text-xs text-muted-foreground'>
            <CircleCheckBig className='h-4 w-4' />
            <span>
              {completedCount}/{totalCount}
            </span>
          </div>
        )}
      </div>

      {/* Row 2: Content preview and date */}
      <div className='mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground'>
        <div className='flex-1 truncate'>
          {issue.lastLogPreview || '(No log)'}
        </div>
        <div className='shrink-0'>{formatIssueDate(issue.updatedAt)}</div>
      </div>
    </button>
  )
}
