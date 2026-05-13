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
import { useObjectives } from '@/hooks/use-objectives'
import { useOperationStream } from '@/hooks/use-operation-stream'
import { ListTodo } from 'lucide-react'
import { ResizablePanel } from '@/components/ui/resizable-panel'
import { OperationDetail } from '@/components/operations/operation-detail'
import { ObjectivesList } from '@/components/objectives/objectives-list'

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
  const [objectivesPanelWidth, setObjectivesPanelWidth] = useLocalStorage(
    'objectives-panel-width',
    320,
  )

  const { operation, isLoading } = useOperation(projectSlug, operationNumber)
  const { data: operationLogs = [] } = useOperationLogs(
    projectSlug,
    operationNumber,
  )
  const { data: notes = [] } = useNotes(projectSlug, operationNumber)
  const { data: objectives = [] } = useObjectives(projectSlug, operationNumber)

  useOperationStream(projectSlug, operationNumber)

  const objectivesDoneCount = objectives.filter((o) => o.done).length
  const objectivesTotalCount = objectives.length
  const objectivesPct =
    objectivesTotalCount === 0
      ? 0
      : (objectivesDoneCount / objectivesTotalCount) * 100
  const objectivesLabel = `${objectivesDoneCount}/${objectivesTotalCount} · ${objectivesPct.toFixed(1)}%`

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
              objectivesDoneCount={objectivesDoneCount}
              objectivesTotalCount={objectivesTotalCount}
            />
          </div>
          {isWideScreen && (
            <ResizablePanel
              width={objectivesPanelWidth}
              onWidthChange={setObjectivesPanelWidth}
              minWidth={240}
              maxWidth={600}
              side='right'
              className='border-l'
            >
              <div className='flex h-full flex-col'>
                <div className='flex items-center gap-2 px-3 pt-2'>
                  <h2 className='flex items-center gap-1.5 text-md font-medium h-9'>
                    <ListTodo className='size-5' />
                    Objectives ({objectivesLabel})
                  </h2>
                </div>
                <div className='flex-1 overflow-hidden'>
                  <ObjectivesList
                    projectSlug={projectSlug}
                    operationNumber={operationNumber}
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
