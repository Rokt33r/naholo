'use client'

import { useEffect, useRef, useState } from 'react'
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { LandPlot, SquarePen } from 'lucide-react'
import { useProjectContext } from '@/components/app/project-context'
import { Button } from '@/components/ui/button'
import { OperationItem } from '@/components/operations/operation-item'
import { OperationsSearchbar } from '@/components/operations/operations-searchbar'
import { CreateOperationDialog } from '@/components/operations/create-operation-dialog'
import { useOperations } from '@/hooks/use-operations'
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
    <div className='flex h-full flex-1 flex-col overflow-hidden'>
      <div className='flex h-10 items-center justify-between gap-2 px-2 pt-2'>
        <h2 className='flex min-w-0 flex-1 items-center gap-2 px-2 font-semibold'>
          <LandPlot className='size-4 shrink-0' />
          <span className='truncate'>Operation list</span>
          <span className='shrink-0 font-mono text-xs font-normal text-muted-foreground'>
            {filteredOperations.length}
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
      />

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
