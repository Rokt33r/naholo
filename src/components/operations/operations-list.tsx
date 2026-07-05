'use client'

import { useEffect, useRef, useState } from 'react'
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { LandPlot, PanelLeftClose, Search, SquarePen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useOperationsList } from './operations-list-context'
import { OperationItem } from './operation-item'
import { CreateOperationDialog } from './create-operation-dialog'
import { useOperations } from '@/hooks/use-operations'
import { useOperationsListStream } from '@/hooks/use-operations-list-stream'
import { useDebounce } from '@/hooks/use-debounce'
import {
  matchesOperationSearch,
  parseOperationSearch,
} from '@/lib/operation-search'
import type { Project } from 'naholo-api/types'

type OperationsListProps = {
  projectSlug: string
}

export function OperationsList({ projectSlug }: OperationsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useParams()
  const currentOperationNumber =
    params.operationNumber != null ? Number(params.operationNumber) : undefined
  const { isMobile, toggle, showCollapseButton } = useOperationsList()

  // `search` is kept out of the useOperations query key, so filtering never
  // refetches from the server.
  const searchSearchParam = searchParams.get('search') ?? ''
  const [searchInput, setSearchInput] = useState(searchSearchParam)
  const debouncedSearchInput = useDebounce(searchInput, 250)

  // Adopt external writes to `?search=` (e.g. label/assignee clicks).
  useEffect(() => {
    setSearchInput(searchSearchParam)
  }, [searchSearchParam])

  // Mirror typing to the URL, debounced. Keyed on the debounced value only —
  // depending on `searchParams` would bounce a stale write over external changes.
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams
  useEffect(() => {
    const currentSearchParams = searchParamsRef.current
    if (debouncedSearchInput === (currentSearchParams.get('search') ?? '')) {
      return
    }
    const params = new URLSearchParams(currentSearchParams)
    if (debouncedSearchInput.length > 0) {
      params.set('search', debouncedSearchInput)
    } else {
      params.delete('search')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [debouncedSearchInput, pathname, router])

  const filter = searchParams.get('filter') === 'closed' ? 'closed' : 'open'

  const { operations, isLoading, refetch } = useOperations(projectSlug, filter)
  useOperationsListStream(projectSlug)

  const searchConditions = parseOperationSearch(searchInput)
  const filteredOperations = operations.filter((operation) =>
    matchesOperationSearch(operation, searchConditions),
  )

  const handleFilterChange = (newFilter: 'open' | 'closed') => {
    const params = new URLSearchParams(searchParams)
    params.set('filter', newFilter)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between gap-2 px-2 pt-2 h-10'>
        {isMobile && <AppModeMenu currentProjectSlug={projectSlug} />}
        <h2 className='flex flex-1 items-center gap-2 px-2 font-semibold'>
          <LandPlot className='size-4' />
          Operations
        </h2>
        {showCollapseButton && (
          <Button size='icon' variant='ghost' onClick={toggle}>
            <PanelLeftClose className='size-4' />
          </Button>
        )}
      </div>

      <div className='flex items-center gap-2 px-2 py-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-2.5 top-2.5 size-4 text-muted-foreground' />
          <Input
            placeholder='Search operations...'
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className='pl-9'
          />
        </div>
      </div>

      <div className='flex items-center justify-between px-2 pb-2'>
        <ButtonGroup>
          <Button
            variant={filter === 'open' ? 'secondary' : 'ghost'}
            onClick={() => handleFilterChange('open')}
          >
            Open
          </Button>
          <Button
            variant={filter === 'closed' ? 'secondary' : 'ghost'}
            onClick={() => handleFilterChange('closed')}
          >
            Closed
          </Button>
        </ButtonGroup>
        <CreateOperationDialog
          projectSlug={projectSlug}
          onOperationCreated={refetch}
        >
          <Button size='icon' variant='ghost'>
            <SquarePen className='size-4' />
          </Button>
        </CreateOperationDialog>
      </div>

      {/* Operations list */}
      <div className='flex-1 overflow-y-auto px-2'>
        {isLoading ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            Loading...
          </div>
        ) : filteredOperations.length === 0 ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            {searchInput
              ? 'No operations found'
              : filter === 'open'
                ? 'No open operations'
                : 'No closed operations'}
          </div>
        ) : (
          <div>
            {filteredOperations.map((operation) => (
              <OperationItem
                key={operation.id}
                operation={operation}
                projectSlug={projectSlug}
                isActive={operation.number === currentOperationNumber}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
