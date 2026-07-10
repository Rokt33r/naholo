'use client'

import { ChevronDown, Search, Tag, Users } from 'lucide-react'
import { useProjectContext } from '@/components/app/project-context'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OperatorAvatar } from '@/components/operators/operator-avatar'
import { LabelBadge } from '@/components/labels/label-badge'
import { useOperators } from '@/hooks/use-operators'
import { useLabels } from '@/hooks/use-labels'
import { buildSearchToken } from '@/lib/operation-search'

type OperationsSearchbarProps = {
  projectSlug: string
  searchInput: string
  onSearchChange: (value: string) => void
  filter: 'open' | 'closed'
  onFilterChange: (filter: 'open' | 'closed') => void
}

export function OperationsSearchbar({
  projectSlug,
  searchInput,
  onSearchChange,
  filter,
  onFilterChange,
}: OperationsSearchbarProps) {
  const { currentOperator } = useProjectContext()
  const { operators } = useOperators(projectSlug)
  const { labels } = useLabels(projectSlug)

  return (
    <>
      <div className='px-2 py-2'>
        <div className='relative'>
          <Search className='absolute left-2.5 top-2.5 size-4 text-muted-foreground' />
          <Input
            placeholder='Search operations…  try assignee:rokt33r or #273'
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className='pl-9'
          />
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2 px-2 pb-2'>
        <ButtonGroup>
          <Button
            variant={filter === 'open' ? 'secondary' : 'ghost'}
            onClick={() => onFilterChange('open')}
          >
            Open
          </Button>
          <Button
            variant={filter === 'closed' ? 'secondary' : 'ghost'}
            onClick={() => onFilterChange('closed')}
          >
            Closed
          </Button>
        </ButtonGroup>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm'>
              <Users className='size-4' />
              Assignees
              <ChevronDown className='size-4 text-muted-foreground' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='start'>
            {operators.map((operator) => (
              <DropdownMenuItem
                key={operator.id}
                onClick={() =>
                  onSearchChange(
                    buildSearchToken('assignee', operator.callsign),
                  )
                }
              >
                <OperatorAvatar name={operator.callsign} className='size-5' />
                {operator.callsign}
                {operator.id === currentOperator.id && ' (me)'}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm'>
              <Tag className='size-4' />
              Labels
              <ChevronDown className='size-4 text-muted-foreground' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='start'>
            {labels.map((label) => (
              <DropdownMenuItem
                key={label.id}
                onClick={() =>
                  onSearchChange(buildSearchToken('label', label.name))
                }
              >
                <LabelBadge name={label.name} color={label.color} size='sm' />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
