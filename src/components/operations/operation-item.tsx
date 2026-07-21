'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CircleDot, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatIssueDate } from '@/lib/date-utils'
import { LabelBadge } from '@/components/labels/label-badge'
import { OperatorAvatar } from '@/components/operators/operator-avatar'
import { buildSearchToken } from '@/lib/operation-search'
import type { OperationListItem } from '@/hooks/use-operations'
import { type KeyboardEvent, type MouseEvent } from 'react'

type OperationItemProps = {
  operation: OperationListItem
  projectSlug: string
}

export function OperationItem({ operation, projectSlug }: OperationItemProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleClick = () => {
    const filter = searchParams.get('filter')
    const query = filter ? `?filter=${encodeURIComponent(filter)}` : ''
    router.push(
      `/app/projects/${projectSlug}/operations/${operation.number}${query}`,
    )
  }

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  // Apply a filter instead of opening the operation.
  const handleSearchableTokenClick = (event: MouseEvent, token: string) => {
    event.stopPropagation()
    const params = new URLSearchParams(searchParams)
    params.set('search', token)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleRowKeyDown}
      className='flex h-11 w-full cursor-pointer items-center gap-2.5 pr-2 text-left'
    >
      {operation.closed ? (
        <CircleCheck className='size-4 shrink-0 text-purple-600' />
      ) : (
        <CircleDot className='size-4 shrink-0 text-green-600' />
      )}

      <span className='shrink-0 font-mono text-xs font-bold text-muted-foreground'>
        #{operation.number}
      </span>

      <span className='min-w-0 truncate text-sm font-medium'>
        {operation.title}
      </span>

      {operation.labels.length > 0 && (
        <span className='flex shrink-0 items-center gap-1'>
          {operation.labels.map((label) => (
            <LabelBadge
              key={label.id}
              name={label.name}
              color={label.color}
              size='sm'
              onClick={(event) =>
                handleSearchableTokenClick(
                  event,
                  buildSearchToken('label', label.name),
                )
              }
            />
          ))}
        </span>
      )}

      <span className='flex-1' />

      {operation.assignees.length > 0 && (
        <span className='flex shrink-0 items-center'>
          {operation.assignees.map((assignee, index) => (
            <span
              key={assignee.id}
              className={cn(
                'rounded-full ring-1 ring-background',
                index > 0 && '-ml-2',
              )}
              style={{ zIndex: operation.assignees.length - index }}
            >
              <OperatorAvatar
                name={assignee.callsign}
                className='size-5'
                onClick={(event) =>
                  handleSearchableTokenClick(
                    event,
                    buildSearchToken('assignee', assignee.callsign),
                  )
                }
              />
            </span>
          ))}
        </span>
      )}

      <span className='w-11 shrink-0 text-right text-xs text-muted-foreground'>
        {formatIssueDate(operation.updatedAt)}
      </span>
    </div>
  )
}
