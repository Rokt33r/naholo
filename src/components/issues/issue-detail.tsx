'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  MoreVertical,
  MessageSquare,
  Loader2,
  CircleDot,
  CircleCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogsList } from '@/components/logs/logs-list'
import { TasksList } from '@/components/tasks/tasks-list'
import { NoteView } from '@/components/notes/note-view'
import { IssueTabs } from './issue-tabs'
import {
  useIssue,
  useUpdateIssueTitle,
  useDeleteIssue,
} from '@/hooks/use-issues'

type IssueDetail = {
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

type Note = {
  id: string
  title: string
  content: string
  position: number
  createdAt: Date
  updatedAt: Date
}

type ActiveTab =
  | { type: 'logs' }
  | { type: 'tasks' }
  | { type: 'note'; noteId: string }

type IssueDetailProps = {
  projectId: string
  issueId: string
  tasks: Task[]
  logs: Log[]
  notes: Note[]
  showLogs: boolean
  onToggleLogs: () => void
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
}

export function IssueDetail({
  projectId,
  issueId,
  tasks,
  logs,
  notes,
  showLogs,
  onToggleLogs,
  activeTab,
  onTabChange,
}: IssueDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { issue, isLoading } = useIssue(projectId, issueId)
  const { updateTitle } = useUpdateIssueTitle()
  const { deleteIssue } = useDeleteIssue()

  // Sync title with fetched issue
  if (issue && title !== issue.title && !isEditingTitle) {
    setTitle(issue.title)
  }

  const handleDeleteIssue = async () => {
    if (!issue) return
    if (!confirm('Are you sure you want to delete this issue?')) {
      return
    }
    setIsDeleting(true)
    try {
      await deleteIssue(projectId, issue.id)
      const query = searchParams.toString()
      router.push(`/app/projects/${projectId}${query ? `?${query}` : ''}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTitleSave = async () => {
    if (!issue || !title.trim() || title === issue.title) {
      setIsEditingTitle(false)
      return
    }

    setIsSaving(true)
    try {
      await updateTitle(projectId, issue.id, title.trim())
    } catch (error) {
      // Error is already toasted by the hook
      setTitle(issue.title)
    } finally {
      setIsSaving(false)
      setIsEditingTitle(false)
    }
  }

  if (isLoading || !issue) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b p-2'>
        <div className='flex-1 px-1'>
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
            <div className='flex items-center gap-2'>
              {issue.closed ? (
                <CircleCheck className='h-5 w-5 shrink-0 text-purple-600' />
              ) : (
                <CircleDot className='h-5 w-5 shrink-0 text-green-600' />
              )}
              <h1
                className='cursor-text text-xl font-semibold'
                onClick={() => setIsEditingTitle(true)}
              >
                {issue.title}
              </h1>
              {isSaving && (
                <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
              )}
            </div>
          )}
        </div>
        <div className='flex items-center gap-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size='icon' variant='ghost' disabled={isDeleting}>
                <MoreVertical className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onClick={handleDeleteIssue}
                className='text-red-600'
              >
                {isDeleting ? 'Deleting...' : 'Delete issue'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {activeTab.type !== 'logs' && (
            <Button
              variant={showLogs ? 'default' : 'outline'}
              size='sm'
              onClick={onToggleLogs}
            >
              <MessageSquare className='mr-2 h-4 w-4' />
              Logs
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <IssueTabs
        projectId={issue.projectId}
        issueId={issue.id}
        notes={notes}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {/* Content */}
      <div className='flex-1 overflow-hidden'>
        {activeTab.type === 'logs' && (
          <LogsList
            projectId={issue.projectId}
            issueId={issue.id}
            logs={logs}
            isClosed={issue.closed}
          />
        )}
        {activeTab.type === 'tasks' && (
          <TasksList
            projectId={issue.projectId}
            issueId={issue.id}
            tasks={tasks}
          />
        )}
        {activeTab.type === 'note' &&
          (() => {
            const note = notes.find((n) => n.id === activeTab.noteId)
            if (!note) {
              return (
                <div className='flex h-full items-center justify-center text-muted-foreground'>
                  Note not found
                </div>
              )
            }
            return (
              <NoteView
                note={note}
                projectId={issue.projectId}
                issueId={issue.id}
                onDeleted={() => onTabChange({ type: 'logs' })}
              />
            )
          })()}
      </div>
    </div>
  )
}
