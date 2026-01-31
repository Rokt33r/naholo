'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IssueDetail } from './issue-detail'
import { LogsList } from '@/components/logs/logs-list'
import { useLogs } from '@/hooks/use-logs'
import { useNotes } from '@/hooks/use-notes'

type ActiveTab =
  | { type: 'logs' }
  | { type: 'tasks' }
  | { type: 'note'; noteId: string }

function parseActiveTab(tabParam: string | null): ActiveTab {
  if (!tabParam || tabParam === 'logs') return { type: 'logs' }
  if (tabParam === 'tasks') return { type: 'tasks' }
  if (tabParam.startsWith('note:')) {
    return { type: 'note', noteId: tabParam.slice(5) }
  }
  return { type: 'logs' }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
    },
  },
})

type Issue = {
  id: string
  projectId: string
  title: string
  closed: boolean
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

type Task = {
  id: string
  content: string
  done: boolean
  parentTaskId: string | null
  position: number
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
  tasks: Task[]
  notes: Note[]
}

function IssueClientPageContent({
  issue,
  tasks,
  notes: initialNotes,
}: IssueClientPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showLogs, setShowLogs] = useState(false)
  const { data: logs = [] } = useLogs(issue.projectId, issue.id)
  const { data: notes = initialNotes } = useNotes(issue.projectId, issue.id)

  const activeTab = parseActiveTab(searchParams.get('tab'))

  const handleTabChange = (newTab: ActiveTab) => {
    const params = new URLSearchParams(searchParams)
    if (newTab.type === 'logs') {
      params.delete('tab')
    } else if (newTab.type === 'tasks') {
      params.set('tab', 'tasks')
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
          tasks={tasks}
          logs={logs}
          notes={notes}
          showLogs={showLogs}
          onToggleLogs={() => setShowLogs(!showLogs)}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>
      {showLogs && activeTab.type !== 'logs' && (
        <div className='w-80 border-l'>
          <LogsList
            projectId={issue.projectId}
            issueId={issue.id}
            logs={logs}
            isClosed={issue.closed}
          />
        </div>
      )}
    </div>
  )
}

export function IssueClientPage({ issue, tasks, notes }: IssueClientPageProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <IssueClientPageContent issue={issue} tasks={tasks} notes={notes} />
    </QueryClientProvider>
  )
}
