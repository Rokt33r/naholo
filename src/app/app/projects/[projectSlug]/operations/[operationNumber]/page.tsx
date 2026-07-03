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
import { useOperation } from '@/hooks/use-operations'
import { useOperationLogs } from '@/hooks/use-operation-logs'
import { useNotes } from '@/hooks/use-notes'
import { useTasks } from '@/hooks/use-tasks'
import { useOperationStream } from '@/hooks/use-operation-stream'
import { ResizablePanel } from '@/components/ui/resizable-panel'
import { OperationDetail } from '@/components/operations/operation-detail'
import { OperationSidePanel } from '@/components/operations/operation-side-panel'

type ActiveTab =
  | { type: 'comms' }
  | { type: 'stats' }
  | { type: 'note'; noteName: string }

function parseActiveTab(tabParam: string | null): ActiveTab {
  if (tabParam === 'comms') {
    return { type: 'comms' }
  }
  if (tabParam === 'stats') {
    return { type: 'stats' }
  }
  if (tabParam?.startsWith('note:')) {
    return { type: 'note', noteName: tabParam.slice(5) }
  }
  return { type: 'comms' }
}

export default function OperationPage() {
  const params = useParams<{
    projectSlug: string
    operationNumber: string
  }>()
  const projectSlug = params.projectSlug
  const operationNumber = Number(params.operationNumber)
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

  const { operation, isLoading } = useOperation(projectSlug, operationNumber)
  const { data: operationLogs = [] } = useOperationLogs(
    projectSlug,
    operationNumber,
  )
  const { data: notes = [] } = useNotes(projectSlug, operationNumber)
  const { data: tasks = [] } = useTasks(projectSlug, operationNumber)

  useOperationStream(projectSlug, operationNumber)

  const tasksDoneCount = tasks.filter((o) => o.done).length
  const tasksTotalCount = tasks.length

  const activeTab = parseActiveTab(searchParams.get('tab'))

  const handleTabChange = (newTab: ActiveTab) => {
    const params = new URLSearchParams(searchParams)
    if (newTab.type === 'comms') {
      params.delete('tab')
    } else if (newTab.type === 'stats') {
      params.set('tab', 'stats')
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
      ) : !operation ? (
        <div className='flex flex-1 items-center justify-center text-muted-foreground'>
          Operation not found
        </div>
      ) : (
        <>
          <div className='flex-1 overflow-hidden'>
            <OperationDetail
              projectSlug={projectSlug}
              operationNumber={operationNumber}
              operationLogs={operationLogs}
              notes={notes}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              isWideScreen={isWideScreen}
              isMobile={isMobile}
              tasksDoneCount={tasksDoneCount}
              tasksTotalCount={tasksTotalCount}
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
              <OperationSidePanel
                projectSlug={projectSlug}
                operationNumber={operationNumber}
                labels={operation.labels}
                assignees={operation.assignees}
              />
            </ResizablePanel>
          )}
        </>
      )}
    </div>
  )
}
