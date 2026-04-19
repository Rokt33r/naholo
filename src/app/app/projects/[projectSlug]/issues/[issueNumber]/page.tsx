'use client'

import { useRef } from 'react'
import {
  useParams,
  useRouter,
  usePathname,
  useSearchParams,
} from 'next/navigation'
import { useContainerWidth } from '@/hooks/use-container-width'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { useIssue } from '@/hooks/use-issues'
import { useLogs } from '@/hooks/use-logs'
import { useNotes } from '@/hooks/use-notes'
import { useTasks } from '@/hooks/use-tasks'
import { ListTodo } from 'lucide-react'
import { ResizablePanel } from '@/components/ui/resizable-panel'
import { IssueDetail } from '@/components/issues/issue-detail'
import { TasksList } from '@/components/tasks/tasks-list'

type ActiveTab = { type: 'logs' } | { type: 'note'; noteName: string }

function parseActiveTab(tabParam: string | null): ActiveTab {
  if (tabParam === 'logs') {
    return { type: 'logs' }
  }
  if (tabParam?.startsWith('note:')) {
    return { type: 'note', noteName: tabParam.slice(5) }
  }
  return { type: 'logs' }
}

export default function IssuePage() {
  const params = useParams<{
    projectSlug: string
    issueNumber: string
  }>()
  const projectSlug = params.projectSlug
  const issueNumber = Number(params.issueNumber)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)
  const containerWidth = useContainerWidth(containerRef)
  const isMobile = useIsMobile()
  const isWideScreen = containerWidth >= 768
  const [tasksPanelWidth, setTasksPanelWidth] = useLocalStorage(
    'tasks-panel-width',
    320,
  )

  const { issue, isLoading } = useIssue(projectSlug, issueNumber)
  const { data: logs = [] } = useLogs(projectSlug, issueNumber)
  const { data: notes = [] } = useNotes(projectSlug, issueNumber)
  const { data: tasks = [] } = useTasks(projectSlug, issueNumber)

  const activeTab = parseActiveTab(searchParams.get('tab'))

  const handleTabChange = (newTab: ActiveTab) => {
    const params = new URLSearchParams(searchParams)
    if (newTab.type === 'logs') {
      params.delete('tab')
    } else if (newTab.type === 'note') {
      params.set('tab', `note:${newTab.noteName}`)
    }
    const query = params.toString()
    router.push(`${pathname}${query ? `?${query}` : ''}`)
  }

  return (
    <div ref={containerRef} className='flex h-full'>
      {isLoading ? (
        <div className='flex flex-1 items-center justify-center text-muted-foreground'>
          Loading...
        </div>
      ) : !issue ? (
        <div className='flex flex-1 items-center justify-center text-muted-foreground'>
          Issue not found
        </div>
      ) : (
        <>
          <div className='flex-1 overflow-hidden'>
            <IssueDetail
              projectSlug={projectSlug}
              issueNumber={issueNumber}
              logs={logs}
              notes={notes}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              isWideScreen={isWideScreen}
              isMobile={isMobile}
              tasksCount={tasks.length}
            />
          </div>
          {isWideScreen && (
            <ResizablePanel
              width={tasksPanelWidth}
              onWidthChange={setTasksPanelWidth}
              minWidth={240}
              maxWidth={600}
              side='right'
              className='border-l'
            >
              <div className='flex h-full flex-col'>
                <div className='flex items-center gap-2 px-3 pt-2'>
                  <h2 className='flex items-center gap-1.5 text-md font-medium h-9'>
                    <ListTodo className='w-4 h-4' />
                    Tasks ({tasks.length})
                  </h2>
                </div>
                <div className='flex-1 overflow-hidden'>
                  <TasksList
                    projectSlug={projectSlug}
                    issueNumber={issueNumber}
                  />
                </div>
              </div>
            </ResizablePanel>
          )}
        </>
      )}
    </div>
  )
}
