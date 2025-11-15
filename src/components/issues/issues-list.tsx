'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Search, Plus, MoreVertical } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IssueItem } from './issue-item'
import { CreateIssueDialog } from './create-issue-dialog'

type Issue = {
  id: string
  title: string
  closed: boolean
  closedAt: Date | null
  updatedAt: Date
}

type IssuesListProps = {
  projectId: string
  issues: Issue[]
}

export function IssuesList({ projectId, issues }: IssuesListProps) {
  const params = useParams()
  const currentIssueId = params.issueId as string | undefined
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'open' | 'closed' | 'all'>('open')

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = issue.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleFilterChange = (newFilter: 'open' | 'closed' | 'all') => {
    setFilter(newFilter)
    // TODO: This should trigger a refetch with the new filter
    // For now, we'll just update the state
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Action bar */}
      <div className='flex items-center gap-2 border-b p-3'>
        <div className='relative flex-1'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500' />
          <Input
            placeholder='Search issues...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>
        <CreateIssueDialog projectId={projectId}>
          <Button size='icon' variant='ghost'>
            <Plus className='h-4 w-4' />
          </Button>
        </CreateIssueDialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size='icon' variant='ghost'>
              <MoreVertical className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => handleFilterChange('open')}>
              Show open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange('closed')}>
              Show closed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange('all')}>
              Show all
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Issues list */}
      <div className='flex-1 overflow-y-auto'>
        {filteredIssues.length === 0 ? (
          <div className='p-4 text-center text-sm text-zinc-500'>
            {searchQuery
              ? 'No issues found'
              : filter === 'open'
                ? 'No open issues'
                : filter === 'closed'
                  ? 'No closed issues'
                  : 'No issues yet'}
          </div>
        ) : (
          <div className='divide-y'>
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
