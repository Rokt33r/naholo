'use client'

import { type ReactNode, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ExternalLink,
  LandPlot,
  MoreHorizontal,
  SquarePen,
  Tags,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectContext } from '@/components/app/project-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreateOperationDialog } from '@/components/operations/create-operation-dialog'
import { OperatorAvatar } from '@/components/operators/operator-avatar'
import { LabelBadge } from '@/components/labels/label-badge'
import { useOperators } from '@/hooks/use-operators'
import { useLabels } from '@/hooks/use-labels'
import { useOperations } from '@/hooks/use-operations'
import { buildSearchToken, parseOperationSearch } from '@/lib/operation-search'

export function OperationsNav() {
  const { projectSlug, currentOperator } = useProjectContext()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { operators } = useOperators(projectSlug)
  const { labels } = useLabels(projectSlug)
  const { operations } = useOperations(projectSlug, 'open')

  const { allCount, assigneeCounts, labelCounts } = useMemo(() => {
    const assigneeCounts = new Map<string, number>()
    const labelCounts = new Map<string, number>()
    for (const operation of operations) {
      for (const assignee of operation.assignees) {
        assigneeCounts.set(
          assignee.callsign,
          (assigneeCounts.get(assignee.callsign) ?? 0) + 1,
        )
      }
      for (const label of operation.labels) {
        labelCounts.set(label.name, (labelCounts.get(label.name) ?? 0) + 1)
      }
    }
    return { allCount: operations.length, assigneeCounts, labelCounts }
  }, [operations])

  // Derive the active entry from the current `?search=` token (lowercased by
  // the parser, so compare against lowercased callsigns / label names).
  const conditions = parseOperationSearch(searchParams.get('search') ?? '')
  const activeAssignee = conditions.assignees[0] ?? null
  const activeLabel = conditions.labels[0] ?? null
  const isAllActive = activeAssignee == null && activeLabel == null

  const navigateWithSearch = (token: string | null) => {
    const params = new URLSearchParams()
    const filter = searchParams.get('filter')
    if (filter != null) {
      params.set('filter', filter)
    }
    if (token != null) {
      params.set('search', token)
    }
    const query = params.toString()
    router.push(
      `/app/projects/${projectSlug}/operations${query ? `?${query}` : ''}`,
    )
  }

  const sortedOperators = [...operators].sort((a, b) => {
    if (a.id === currentOperator.id) {
      return -1
    }
    if (b.id === currentOperator.id) {
      return 1
    }
    return 0
  })

  return (
    <div className='hidden h-full w-60 shrink-0 flex-col border-r md:flex'>
      <div className='flex h-10 items-center justify-between gap-2 px-4 pt-2 font-semibold'>
        <div className='flex items-center gap-2'>
          <LandPlot className='size-4' />
          Operations
        </div>
        <CreateOperationDialog projectSlug={projectSlug}>
          <Button variant='ghost' size='icon' aria-label='New operation'>
            <SquarePen className='size-4' />
          </Button>
        </CreateOperationDialog>
      </div>

      <div className='flex-1 overflow-y-auto px-2 pb-4'>
        <NavRow
          active={isAllActive}
          count={allCount}
          onClick={() => navigateWithSearch(null)}
        >
          <span className='flex-1 truncate text-left'>All operations</span>
        </NavRow>

        <NavSectionHeading
          action={<OperatorsHeaderMenu projectSlug={projectSlug} />}
        >
          <div className='flex gap-2'>
            <Users className='size-4' />
            Operators
          </div>
        </NavSectionHeading>
        {sortedOperators.map((operator) => (
          <NavRow
            key={operator.id}
            active={activeAssignee === operator.callsign.toLowerCase()}
            count={assigneeCounts.get(operator.callsign) ?? 0}
            onClick={() =>
              navigateWithSearch(
                buildSearchToken('assignee', operator.callsign),
              )
            }
          >
            <OperatorAvatar name={operator.callsign} className='size-5' />
            <span className='truncate text-left'>
              {operator.callsign}
              {operator.id === currentOperator.id && ' (me)'}
            </span>
          </NavRow>
        ))}

        <NavSectionHeading
          action={<LabelsHeaderMenu projectSlug={projectSlug} />}
        >
          <div className='flex gap-2'>
            <Tags className='size-4' />
            Labels
          </div>
        </NavSectionHeading>
        {labels.map((label) => (
          <NavRow
            key={label.id}
            active={activeLabel === label.name.toLowerCase()}
            count={labelCounts.get(label.name) ?? 0}
            onClick={() =>
              navigateWithSearch(buildSearchToken('label', label.name))
            }
          >
            <LabelBadge name={label.name} color={label.color} size='sm' />
          </NavRow>
        ))}
      </div>
    </div>
  )
}

function NavRow({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent',
        active && 'bg-accent/50 font-medium',
      )}
    >
      {children}
      <span className='shrink-0 font-mono text-xs text-muted-foreground'>
        {count}
      </span>
    </button>
  )
}

function NavSectionHeading({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className='flex items-center justify-between pl-2 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
      {children}
      {action}
    </div>
  )
}

function OperatorsHeaderMenu({ projectSlug }: { projectSlug: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon-sm' aria-label='Operators menu'>
          <MoreHorizontal className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        <DropdownMenuItem asChild>
          <Link
            href={`/app/projects/${projectSlug}/settings/operators`}
            target='_blank'
            rel='noopener noreferrer'
          >
            <ExternalLink className='size-4' />
            Open operators page
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function LabelsHeaderMenu({ projectSlug }: { projectSlug: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon-sm' aria-label='Labels menu'>
          <MoreHorizontal className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        <DropdownMenuItem asChild>
          <Link
            href={`/app/projects/${projectSlug}/settings/labels`}
            target='_blank'
            rel='noopener noreferrer'
          >
            <ExternalLink className='size-4' />
            Open labels page
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
