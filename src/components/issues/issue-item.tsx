'use client'

import { useRouter } from 'next/navigation'
import { CircleCheckBig } from 'lucide-react'
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

  const handleClick = () => {
    router.push(`/app/projects/${projectId}/issues/${issue.id}`)
  }

  const completedCount = issue.completedTasks
    ? parseInt(issue.completedTasks, 10)
    : 0
  const totalCount = issue.totalTasks || 0

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full border-b px-4 py-3 text-left transition-colors hover:bg-accent',
        isActive && 'bg-accent',
      )}
    >
      {/* Row 1: Title and progress */}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex-1 truncate font-bold'>{issue.title}</div>
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
