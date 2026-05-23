'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CircleCheckBig, CircleDot, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatIssueDate } from '@/lib/date-utils'
import type { OperationListItem } from '@/hooks/use-operations'

type OperationItemProps = {
  operation: OperationListItem
  projectSlug: string
  isActive: boolean
}

export function OperationItem({
  operation,
  projectSlug,
  isActive,
}: OperationItemProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleClick = () => {
    const filter = searchParams.get('filter')
    const query = filter ? `?filter=${encodeURIComponent(filter)}` : ''
    router.push(
      `/app/projects/${projectSlug}/operations/${operation.number}${query}`,
    )
  }

  const completedCount = operation.completedTasks
  const totalCount = operation.totalTasks || 0

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
          {operation.closed ? (
            <CircleCheck className='h-4 w-4 shrink-0 text-purple-600' />
          ) : (
            <CircleDot className='h-4 w-4 shrink-0 text-green-600' />
          )}
          <div className='truncate font-bold'>{operation.title}</div>
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
      <div className='mt-1 flex items-center justify-between gap-1 text-xs text-muted-foreground'>
        <span className='shrink-0 font-mono font-bold text-muted-foreground'>
          #{operation.number}
        </span>
        <div className='flex-1 truncate'>
          {operation.lastOperationLogPreview || '(No log)'}
        </div>
        <div className='shrink-0'>{formatIssueDate(operation.updatedAt)}</div>
      </div>
    </button>
  )
}
