'use client'

import { useState, useEffect } from 'react'
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { Search, SquarePen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { IssueItem } from './issue-item'
import { CreateIssueDialog } from './create-issue-dialog'
import { cn } from '@/lib/utils'

type Issue = {
  id: string
  title: string
  lastLogPreview: string | null
  closed: boolean
  closedAt: Date | null
  updatedAt: Date
  totalTasks: number
  completedTasks: string | null
}

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
  const [issues, setIssues] = useState<Issue[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const filter = searchParams.get('filter') === 'closed' ? 'closed' : 'open'

  useEffect(() => {
    async function fetchIssues() {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/projects/${projectId}/issues?closed=${filter === 'closed'}`,
        )
        if (response.ok) {
          const data = await response.json()
          setIssues(data)
        }
      } catch (error) {
        console.error('Failed to fetch issues:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchIssues()
  }, [projectId, filter])

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
      <div className='flex items-center justify-between border-b px-4 py-3'>
        <h2 className='font-semibold'>{projectName}</h2>
        <div className='flex items-center gap-1'>
          <Button
            size='sm'
            variant={filter === 'open' ? 'default' : 'ghost'}
            onClick={() => handleFilterChange('open')}
          >
            Open
          </Button>
          <Button
            size='sm'
            variant={filter === 'closed' ? 'default' : 'ghost'}
            onClick={() => handleFilterChange('closed')}
          >
            Closed
          </Button>
          <CreateIssueDialog projectId={projectId}>
            <Button size='icon' variant='ghost' className='size-8'>
              <SquarePen className='h-4 w-4' />
            </Button>
          </CreateIssueDialog>
        </div>
      </div>

      {/* Header - Row 2: Search */}
      <div className='border-b px-4 py-2'>
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
      <div className='flex-1 overflow-y-auto'>
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
