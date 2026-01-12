'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IssueDetail } from './issue-detail'
import { TasksList } from '@/components/tasks/tasks-list'
import { useLogs } from '@/hooks/use-logs'

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

type IssueClientPageProps = {
  issue: Issue
  tasks: Task[]
}

function IssueClientPageContent({ issue, tasks }: IssueClientPageProps) {
  const [showTasks, setShowTasks] = useState(true)
  const { data: logs = [] } = useLogs(issue.projectId, issue.id)

  return (
    <div className='flex h-full'>
      <div className='flex-1 overflow-hidden'>
        <IssueDetail
          projectId={issue.projectId}
          issueId={issue.id}
          tasks={tasks}
          logs={logs}
          showTasks={showTasks}
          onToggleTasks={() => setShowTasks(!showTasks)}
        />
      </div>
      {showTasks && (
        <div className='w-80 border-l'>
          <TasksList
            projectId={issue.projectId}
            issueId={issue.id}
            tasks={tasks}
          />
        </div>
      )}
    </div>
  )
}

export function IssueClientPage({ issue, tasks }: IssueClientPageProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <IssueClientPageContent issue={issue} tasks={tasks} />
    </QueryClientProvider>
  )
}
