'use client'

import { useState } from 'react'
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { PanelLeftClose, Search, SquarePen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { ProjectSwitcher } from '@/components/projects/project-switcher'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useOperationsList } from './operations-list-context'
import { OperationItem } from './operation-item'
import { CreateOperationDialog } from './create-operation-dialog'
import { useOperations } from '@/hooks/use-operations'
import { useOperationsListStream } from '@/hooks/use-operations-list-stream'
import type { Project } from 'naholo-api/types'

type OperationsListProps = {
  projectSlug: string
  projectName: string
  projects: Project[]
}

export function OperationsList({
  projectSlug,
  projectName,
  projects,
}: OperationsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useParams()
  const currentOperationNumber =
    params.operationNumber != null ? Number(params.operationNumber) : undefined
  const { isMobile, toggle, showCollapseButton } = useOperationsList()
  const [searchQuery, setSearchQuery] = useState('')

  const filter = searchParams.get('filter') === 'closed' ? 'closed' : 'open'

  const { operations, isLoading, refetch } = useOperations(projectSlug, filter)
  useOperationsListStream(projectSlug)

  const filteredOperations = operations.filter((operation) => {
    const query = searchQuery.toLowerCase()
    const matchesTitle = operation.title.toLowerCase().includes(query)
    const matchesNumber = query.startsWith('#')
      ? operation.number.toString().startsWith(query.slice(1))
      : false
    return matchesTitle || matchesNumber
  })

  const handleFilterChange = (newFilter: 'open' | 'closed') => {
    const params = new URLSearchParams(searchParams)
    params.set('filter', newFilter)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between px-2 pt-2 gap-2'>
        {isMobile && <AppModeMenu currentProjectSlug={projectSlug} />}
        <ProjectSwitcher
          projects={projects}
          currentProjectSlug={projectSlug}
          currentProjectName={projectName}
        />
        {showCollapseButton && (
          <Button size='icon' variant='ghost' onClick={toggle}>
            <PanelLeftClose className='size-5' />
          </Button>
        )}
      </div>

      <div className='flex items-center gap-2 px-2 py-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-2.5 top-2.5 size-5 text-muted-foreground' />
          <Input
            placeholder='Search operations...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            <SquarePen className='size-5' />
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
            {searchQuery
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
