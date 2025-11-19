'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, X, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogsList } from '@/components/logs/logs-list'
import { useAction } from '@/lib/use-action'
import {
  updateIssueAction,
  closeIssueAction,
  reopenIssueAction,
  deleteIssueAction,
} from '@/app/app/actions'

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

type IssueDetailProps = {
  issue: Issue
  tasks: Task[]
  logs: Log[]
  showTasks: boolean
  onToggleTasks: () => void
}

export function IssueDetail({
  issue,
  tasks,
  logs,
  showTasks,
  onToggleTasks,
}: IssueDetailProps) {
  const router = useRouter()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [title, setTitle] = useState(issue.title)

  const completedTasks = tasks.filter((task) => task.done).length
  const totalTasks = tasks.length

  const { execute: updateIssue, loading: updateLoading } =
    useAction(updateIssueAction)
  const { execute: closeIssue, loading: closeLoading } =
    useAction(closeIssueAction)
  const { execute: reopenIssue, loading: reopenLoading } =
    useAction(reopenIssueAction)
  const { execute: deleteIssue, loading: deleteLoading } =
    useAction(deleteIssueAction)

  const handleCloseIssue = async () => {
    const result = await closeIssue(issue.id)
    if (!result.success) {
      alert('Failed to close issue: ' + result.error.message)
    }
  }

  const handleReopenIssue = async () => {
    const result = await reopenIssue(issue.id)
    if (!result.success) {
      alert('Failed to reopen issue: ' + result.error.message)
    }
  }

  const handleDeleteIssue = async () => {
    if (!confirm('Are you sure you want to delete this issue?')) {
      return
    }
    const result = await deleteIssue(issue.id)
    if (result.success) {
      router.push(`/app/projects/${issue.projectId}`)
    } else {
      alert('Failed to delete issue: ' + result.error.message)
    }
  }

  const handleTitleSave = async () => {
    if (title.trim() && title !== issue.title) {
      const result = await updateIssue(issue.id, title.trim())
      if (!result.success) {
        alert('Failed to update title: ' + result.error.message)
        setTitle(issue.title)
      }
    }
    setIsEditingTitle(false)
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b p-2'>
        <div className='flex-1 px-2'>
          {isEditingTitle ? (
            <input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTitleSave()
                } else if (e.key === 'Escape') {
                  setTitle(issue.title)
                  setIsEditingTitle(false)
                }
              }}
              className='w-full bg-transparent text-xl font-semibold outline-none'
              autoFocus
            />
          ) : (
            <h1
              className='cursor-text text-xl font-semibold'
              onClick={() => setIsEditingTitle(true)}
            >
              {issue.title}
            </h1>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {issue.closed ? (
            <Button
              variant='outline'
              size='sm'
              onClick={handleReopenIssue}
              disabled={reopenLoading}
            >
              {reopenLoading ? 'Reopening...' : 'Reopen'}
            </Button>
          ) : (
            <Button
              variant='outline'
              size='sm'
              onClick={handleCloseIssue}
              disabled={closeLoading}
            >
              <X className='mr-2 h-4 w-4' />
              {closeLoading ? 'Closing...' : 'Close'}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size='icon' variant='ghost' disabled={deleteLoading}>
                <MoreVertical className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onClick={handleDeleteIssue}
                className='text-red-600'
              >
                {deleteLoading ? 'Deleting...' : 'Delete issue'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={showTasks ? 'default' : 'outline'}
            size='sm'
            onClick={onToggleTasks}
          >
            <ListTodo className='mr-2 h-4 w-4' />
            {completedTasks}/{totalTasks}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-hidden'>
        <LogsList projectId={issue.projectId} issueId={issue.id} logs={logs} />
      </div>
    </div>
  )
}
