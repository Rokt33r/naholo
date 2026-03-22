'use client'

import { useRef, useState } from 'react'
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
import { ResizablePanel } from '@/components/ui/resizable-panel'
import { IssueDetail } from '@/components/issues/issue-detail'
import { LogsList } from '@/components/logs/logs-list'

type ActiveTab = { type: 'tasks' } | { type: 'note'; noteId: string }

function parseActiveTab(tabParam: string | null): ActiveTab {
  if (tabParam?.startsWith('note:')) {
    return { type: 'note', noteId: tabParam.slice(5) }
  }
  return { type: 'tasks' }
}

export default function IssuePage() {
  const { projectId, issueId } = useParams<{
    projectId: string
    issueId: string
  }>()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)
  const containerWidth = useContainerWidth(containerRef)
  const isMobile = useIsMobile()
  const isWideScreen = containerWidth >= 768
  const [showLogs, setShowLogs] = useState(false)
  const [logsPanelWidth, setLogsPanelWidth] = useLocalStorage(
    'logs-panel-width',
    320,
  )

  const { issue, isLoading } = useIssue(projectId, issueId)
  const { data: logs = [] } = useLogs(projectId, issueId)
  const { data: notes = [] } = useNotes(projectId, issueId)

  const activeTab = parseActiveTab(searchParams.get('tab'))

  const handleTabChange = (newTab: ActiveTab) => {
    const params = new URLSearchParams(searchParams)
    if (newTab.type === 'tasks') {
      params.delete('tab')
    } else if (newTab.type === 'note') {
      params.set('tab', `note:${newTab.noteId}`)
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
              projectId={projectId}
              issueId={issueId}
              logs={logs}
              notes={notes}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              showLogs={showLogs}
              onToggleLogs={() => setShowLogs((v) => !v)}
              isWideScreen={isWideScreen}
              isMobile={isMobile}
            />
          </div>
          {isWideScreen && (
            <ResizablePanel
              width={logsPanelWidth}
              onWidthChange={setLogsPanelWidth}
              minWidth={240}
              maxWidth={600}
              side='right'
              className='border-l'
            >
              <LogsList
                projectId={projectId}
                issueId={issueId}
                logs={logs}
                isClosed={issue.closed}
              />
            </ResizablePanel>
          )}
        </>
      )}
    </div>
  )
}
