'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IssueDetail } from './issue-detail'
import { LogsList } from '@/components/logs/logs-list'
import { useLogs } from '@/hooks/use-logs'
import { useNotes } from '@/hooks/use-notes'

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
  const [showLogs, setShowLogs] = useState(false)
  const { data: logs = [] } = useLogs(issue.projectId, issue.id)
  const { data: notes = initialNotes } = useNotes(issue.projectId, issue.id)

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
        />
      </div>
      {showLogs && (
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
