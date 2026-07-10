'use client'

import { ChevronDown, Search, Tag, Users } from 'lucide-react'
import { useProjectContext } from '@/components/app/project-context'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OperatorAvatar } from '@/components/operators/operator-avatar'
import { LabelBadge } from '@/components/labels/label-badge'
import { useOperators } from '@/hooks/use-operators'
import { useLabels } from '@/hooks/use-labels'
import { parseOperationSearch, toggleSearchToken } from '@/lib/operation-search'

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

  // The active assignee / label tokens (lowercased) drive the dropdown checks.
  const conditions = parseOperationSearch(searchInput)

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
              <DropdownMenuCheckboxItem
                key={operator.id}
                checked={conditions.assignees.includes(
                  operator.callsign.toLowerCase(),
                )}
                onCheckedChange={() =>
                  onSearchChange(
                    toggleSearchToken(
                      searchInput,
                      'assignee',
                      operator.callsign,
                    ),
                  )
                }
                onSelect={(event) => event.preventDefault()}
              >
                <OperatorAvatar name={operator.callsign} className='size-5' />
                {operator.callsign}
                {operator.id === currentOperator.id && ' (me)'}
              </DropdownMenuCheckboxItem>
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
              <DropdownMenuCheckboxItem
                key={label.id}
                checked={conditions.labels.includes(label.name.toLowerCase())}
                onCheckedChange={() =>
                  onSearchChange(
                    toggleSearchToken(searchInput, 'label', label.name),
                  )
                }
                onSelect={(event) => event.preventDefault()}
              >
                <LabelBadge name={label.name} color={label.color} size='sm' />
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
