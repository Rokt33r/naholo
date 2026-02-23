'use client'

import { useState } from 'react'
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { Search, SquarePen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { IssueItem } from './issue-item'
import { CreateIssueDialog } from './create-issue-dialog'
import { useIssues } from '@/hooks/use-issues'

type IssuesListProps = {
  projectId: string
  projectName: string
}

export function IssuesList({ projectId, projectName }: IssuesListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useParams()
  const currentIssueId = params.issueId as string | undefined
  const [searchQuery, setSearchQuery] = useState('')

  const filter = searchParams.get('filter') === 'closed' ? 'closed' : 'open'

  const { issues, isLoading, refetch } = useIssues(projectId, filter)

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = issue.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleFilterChange = (newFilter: 'open' | 'closed') => {
    const params = new URLSearchParams(searchParams)
    params.set('filter', newFilter)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Header - Row 1: Project name and action buttons */}
      <div className='flex items-center justify-between px-2 py-3'>
        <h2 className='font-semibold px-2'>{projectName}</h2>
        <div className='flex items-center gap-2'>
          <ButtonGroup>
            <Button
              size='sm'
              variant={filter === 'open' ? 'secondary' : 'ghost'}
              onClick={() => handleFilterChange('open')}
            >
              Open
            </Button>
            <Button
              size='sm'
              variant={filter === 'closed' ? 'secondary' : 'ghost'}
              onClick={() => handleFilterChange('closed')}
            >
              Closed
            </Button>
          </ButtonGroup>
          <CreateIssueDialog projectId={projectId} onIssueCreated={refetch}>
            <Button size='icon' variant='outline' className='size-8'>
              <SquarePen className='h-4 w-4' />
            </Button>
          </CreateIssueDialog>
        </div>
      </div>

      {/* Header - Row 2: Search */}
      <div className='px-2 mb-2'>
        <div className='relative'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search issues...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>
      </div>

      {/* Issues list */}
      <div className='flex-1 overflow-y-auto px-2'>
        {isLoading ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            Loading...
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            {searchQuery
              ? 'No issues found'
              : filter === 'open'
                ? 'No open issues'
                : 'No closed issues'}
          </div>
        ) : (
          <div>
            {filteredIssues.map((issue) => (
              <IssueItem
                key={issue.id}
                issue={issue}
                projectId={projectId}
                isActive={issue.id === currentIssueId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
