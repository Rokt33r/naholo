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
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useIssuesList } from './issues-list-context'
import { IssueItem } from './issue-item'
import { CreateIssueDialog } from './create-issue-dialog'
import { useIssues } from '@/hooks/use-issues'
import type { Project } from 'naholo-api/types'

type IssuesListProps = {
  projectSlug: string
  projectName: string
  projects: Project[]
}

export function IssuesList({
  projectSlug,
  projectName,
  projects,
}: IssuesListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useParams()
  const currentIssueNumber =
    params.issueNumber != null ? Number(params.issueNumber) : undefined
  const isMobile = useIsMobile()
  const { toggle } = useIssuesList()
  const [searchQuery, setSearchQuery] = useState('')

  const filter = searchParams.get('filter') === 'closed' ? 'closed' : 'open'

  const { issues, isLoading, refetch } = useIssues(projectSlug, filter)

  const filteredIssues = issues.filter((issue) => {
    const query = searchQuery.toLowerCase()
    const matchesTitle = issue.title.toLowerCase().includes(query)
    const matchesNumber = query.startsWith('#')
      ? issue.number.toString().startsWith(query.slice(1))
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
        {!isMobile && (
          <Button size='icon' variant='ghost' onClick={toggle}>
            <PanelLeftClose className='h-4 w-4' />
          </Button>
        )}
      </div>

      <div className='flex items-center gap-2 px-2 py-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search issues...'
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
        <CreateIssueDialog projectSlug={projectSlug} onIssueCreated={refetch}>
          <Button size='icon' variant='ghost'>
            <SquarePen className='h-4 w-4' />
          </Button>
        </CreateIssueDialog>
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
                projectSlug={projectSlug}
                isActive={issue.number === currentIssueNumber}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
