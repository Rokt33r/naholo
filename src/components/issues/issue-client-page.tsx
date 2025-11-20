'use client'

import { useState } from 'react'
import { IssueDetail } from './issue-detail'
import { TasksList } from '@/components/tasks/tasks-list'

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

type Log = {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
}

type IssueClientPageProps = {
  issue: Issue
  tasks: Task[]
  logs: Log[]
}

export function IssueClientPage({ issue, tasks, logs }: IssueClientPageProps) {
  const [showTasks, setShowTasks] = useState(true)

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
