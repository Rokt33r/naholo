'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { ResizablePanel } from '@/components/ui/resizable-panel'
import { IssueDetail } from './issue-detail'
import { LogsList } from '@/components/logs/logs-list'
import { useLogs } from '@/hooks/use-logs'
import { useNotes } from '@/hooks/use-notes'

type ActiveTab = { type: 'tasks' } | { type: 'note'; noteId: string }

function parseActiveTab(tabParam: string | null): ActiveTab {
  if (tabParam?.startsWith('note:')) {
    return { type: 'note', noteId: tabParam.slice(5) }
  }
  return { type: 'tasks' }
}

type Issue = {
  id: string
  projectId: string
  title: string
  closed: boolean
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

type Note = {
  id: string
  title: string
  content: string
  position: number
  createdAt: Date
  updatedAt: Date
}

type IssueClientPageProps = {
  issue: Issue
  notes: Note[]
}

export function IssueClientPage({
  issue,
  notes: initialNotes,
}: IssueClientPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isWideScreen = useMediaQuery('(min-width: 1024px)')
  const [showLogs, setShowLogs] = useState(false)
  const [logsPanelWidth, setLogsPanelWidth] = useLocalStorage(
    'logs-panel-width',
    320,
  )
  const { data: logs = [] } = useLogs(issue.projectId, issue.id)
  const { data: notes = initialNotes } = useNotes(issue.projectId, issue.id)

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
    <div className='flex h-full'>
      <div className='flex-1 overflow-hidden'>
        <IssueDetail
          projectId={issue.projectId}
          issueId={issue.id}
          logs={logs}
          notes={notes}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          showLogs={showLogs}
          onToggleLogs={() => setShowLogs((v) => !v)}
          isWideScreen={isWideScreen}
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
            projectId={issue.projectId}
            issueId={issue.id}
            logs={logs}
            isClosed={issue.closed}
          />
        </ResizablePanel>
      )}
    </div>
  )
}
