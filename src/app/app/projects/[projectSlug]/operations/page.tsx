'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { LandPlot, SquarePen } from 'lucide-react'
import { useProjectContext } from '@/components/app/project-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { OperationItem } from '@/components/operations/operation-item'
import {
  OperationsSearchbar,
  type OperationSortDirection,
  type OperationSortKey,
} from '@/components/operations/operations-searchbar'
import { CreateOperationDialog } from '@/components/operations/create-operation-dialog'
import { useOperations, type OperationListItem } from '@/hooks/use-operations'
import { useOperationsListStream } from '@/hooks/use-operations-list-stream'
import { useDebounce } from '@/hooks/use-debounce'
import {
  matchesOperationSearch,
  parseOperationSearch,
} from '@/lib/operation-search'

export default function OperationsIndexPage() {
  const { projectSlug } = useProjectContext()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useParams()
  const currentOperationNumber =
    params.operationNumber != null ? Number(params.operationNumber) : undefined

  // `search` is kept out of the useOperations query key, so filtering never
  // refetches from the server.
  const searchSearchParam = searchParams.get('search') ?? ''
  const [searchInput, setSearchInput] = useState(searchSearchParam)
  const debouncedSearchInput = useDebounce(searchInput, 250)

  // Adopt external writes to `?search=` (e.g. nav / label / assignee clicks).
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

  const sortParam = searchParams.get('sort')
  const sort: OperationSortKey =
    sortParam === 'created' || sortParam === 'number' ? sortParam : 'updated'
  const direction: OperationSortDirection =
    searchParams.get('dir') === 'asc' ? 'asc' : 'desc'

  const { operations, isLoading, refetch } = useOperations(projectSlug, filter)
  useOperationsListStream(projectSlug)

  const sortedOperations = useMemo(() => {
    const searchConditions = parseOperationSearch(searchInput)
    const filtered = operations.filter((operation) =>
      matchesOperationSearch(operation, searchConditions),
    )
    return filtered.sort((a, b) => {
      const order = compareOperations(a, b, sort)
      return direction === 'asc' ? order : -order
    })
  }, [operations, searchInput, sort, direction])

  const [selectedOpIds, setSelectedOpIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSelectedOpIds(new Set())
  }, [projectSlug, filter, sort, direction])

  const selectedOperations = useMemo(
    () =>
      sortedOperations.filter((operation) => selectedOpIds.has(operation.id)),
    [sortedOperations, selectedOpIds],
  )
  const selectionActive = selectedOperations.length > 0

  const handleToggleSelect = (operationId: string) => {
    setSelectedOpIds((prev) => {
      const next = new Set(prev)
      if (next.has(operationId)) {
        next.delete(operationId)
      } else {
        next.add(operationId)
      }
      return next
    })
  }

  const handleFilterChange = (newFilter: 'open' | 'closed') => {
    const params = new URLSearchParams(searchParams)
    params.set('filter', newFilter)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleSortChange = (key: OperationSortKey) => {
    const params = new URLSearchParams(searchParams)
    const nextDirection =
      key === sort ? (direction === 'asc' ? 'desc' : 'asc') : 'desc'
    params.set('sort', key)
    params.set('dir', nextDirection)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className='flex h-full flex-1 flex-col overflow-hidden'>
      <div className='flex h-10 items-center justify-between gap-2 px-2 pt-2'>
        <div className='md:hidden'>
          <AppModeMenu currentProjectSlug={projectSlug} />
        </div>
        <h2 className='flex min-w-0 flex-1 items-center gap-2 px-2 font-semibold'>
          <LandPlot className='size-4 shrink-0' />
          <span className='truncate'>Operation list</span>
          <span className='shrink-0 font-mono text-xs font-normal text-muted-foreground'>
            {sortedOperations.length}
          </span>
        </h2>
        <CreateOperationDialog
          projectSlug={projectSlug}
          onOperationCreated={refetch}
        >
          <Button variant='ghost'>
            <SquarePen className='size-4' />
            New
          </Button>
        </CreateOperationDialog>
      </div>

      <OperationsSearchbar
        projectSlug={projectSlug}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        filter={filter}
        onFilterChange={handleFilterChange}
        sort={sort}
        direction={direction}
        onSortChange={handleSortChange}
      />

      {/* Operations list */}
      <div className='flex-1 overflow-y-auto px-2'>
        {isLoading ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            Loading...
          </div>
        ) : sortedOperations.length === 0 ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            {searchInput
              ? 'No operations found'
              : filter === 'open'
                ? 'No open operations'
                : 'No closed operations'}
          </div>
        ) : (
          <div>
            {sortedOperations.map((operation) => (
              <div
                key={operation.id}
                className={cn(
                  'group flex items-center rounded-md transition-colors hover:bg-accent',
                  operation.number === currentOperationNumber &&
                    'bg-accent/50 hover:bg-accent',
                )}
              >
                <label
                  htmlFor={`select-op-${operation.id}`}
                  className='flex w-7 shrink-0 cursor-pointer items-center justify-center self-stretch'
                >
                  <Checkbox
                    id={`select-op-${operation.id}`}
                    checked={selectedOpIds.has(operation.id)}
                    onCheckedChange={() => handleToggleSelect(operation.id)}
                    aria-label={`Select operation #${operation.number}`}
                    className={cn(
                      !selectedOpIds.has(operation.id) &&
                        !selectionActive &&
                        'opacity-0 group-hover:opacity-100',
                    )}
                  />
                </label>
                <div className='min-w-0 flex-1'>
                  <OperationItem
                    operation={operation}
                    projectSlug={projectSlug}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function compareOperations(
  a: OperationListItem,
  b: OperationListItem,
  key: OperationSortKey,
): number {
  switch (key) {
    case 'number':
      return a.number - b.number
    case 'created':
      return a.createdAt.localeCompare(b.createdAt)
    case 'updated':
      return a.updatedAt.localeCompare(b.updatedAt)
  }
}
