'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  MoreVertical,
  Loader2,
  CircleDot,
  CircleCheck,
  MessageSquare,
  PanelLeftOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogsList } from '@/components/logs/logs-list'
import type { Log } from '@/hooks/use-logs'
import { TasksList } from '@/components/tasks/tasks-list'
import { NoteView } from '@/components/notes/note-view'
import { useIssuesList } from './issues-list-context'
import { IssueTabs } from './issue-tabs'
import {
  useIssue,
  useUpdateIssueTitle,
  useDeleteIssue,
} from '@/hooks/use-issues'
import { useUpdateNote } from '@/hooks/use-notes'
import { useIssueNoteStore } from '@/hooks/use-issue-note-store'
import type { IssueDetail, Note } from 'naholo-api/types'

type ActiveTab = { type: 'tasks' } | { type: 'note'; noteId: string }

type IssueDetailProps = {
  projectId: string
  issueId: string
  logs: Log[]
  notes: Note[]
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
  showLogs: boolean
  onToggleLogs: () => void
  isWideScreen: boolean
  isMobile: boolean
}

export function IssueDetail({
  projectId,
  issueId,
  logs,
  notes,
  activeTab,
  onTabChange,
  showLogs,
  onToggleLogs,
  isWideScreen,
  isMobile,
}: IssueDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { collapsed, toggle: toggleIssuesList } = useIssuesList()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { issue, isLoading } = useIssue(projectId, issueId)
  const { mutateAsync: updateTitle } = useUpdateIssueTitle(projectId, issueId)
  const { mutateAsync: deleteIssue } = useDeleteIssue(projectId, issueId)
  const { mutateAsync: updateNote } = useUpdateNote(projectId, issueId)

  const handleNoteSave = useCallback(
    async (noteId: string, content: string) => {
      const note = notes.find((n) => n.id === noteId)
      if (!note || note.id.startsWith('temp-')) {
        return
      }
      await updateNote({ noteId, title: note.title, content }).catch(
        (error: unknown) => {
          console.error('Failed to auto-save note content:', error)
        },
      )
    },
    [notes, updateNote],
  )

  const store = useIssueNoteStore({
    issueId,
    onSave: handleNoteSave,
  })

  // Initialize store entries when notes load
  useEffect(() => {
    notes.forEach((n) => store.initNote(n.id, n.content))
  }, [notes, store.initNote])

  const handleTabChange = useCallback(
    (newTab: ActiveTab) => {
      if (activeTab.type === 'note') {
        store.flush(activeTab.noteId)
      }
      onTabChange(newTab)
    },
    [activeTab, store.flush, onTabChange],
  )

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
      await deleteIssue()
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
      await updateTitle(title.trim())
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
      <div className='flex items-center justify-between pt-2 px-2'>
        {isMobile ? (
          <Button
            size='icon'
            variant='ghost'
            onClick={() => {
              const query = searchParams.toString()
              router.push(
                `/app/projects/${projectId}${query ? `?${query}` : ''}`,
              )
            }}
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
        ) : (
          collapsed && (
            <Button size='icon' variant='ghost' onClick={toggleIssuesList}>
              <PanelLeftOpen className='h-4 w-4' />
            </Button>
          )
        )}
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
          {!isWideScreen && (
            <Button
              size='sm'
              variant={showLogs ? 'secondary' : 'ghost'}
              onClick={onToggleLogs}
            >
              <MessageSquare className='mr-1 h-4 w-4' />
              Logs
            </Button>
          )}
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
        </div>
      </div>

      {showLogs && !isWideScreen ? (
        <div className='flex-1 overflow-hidden'>
          <LogsList
            projectId={issue.projectId}
            issueId={issue.id}
            logs={logs}
            isClosed={issue.closed}
          />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <IssueTabs
            projectId={issue.projectId}
            issueId={issue.id}
            notes={notes}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            notesSaveState={store.saveStates}
          />

          {/* Content */}
          <div className='flex-1 overflow-hidden'>
            {activeTab.type === 'tasks' && (
              <TasksList projectId={issue.projectId} issueId={issue.id} />
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
                    key={note.id}
                    note={note}
                    projectId={issue.projectId}
                    issueId={issue.id}
                    initialContent={store.getContent(note.id) ?? note.content}
                    saveState={store.saveStates[note.id] ?? 'idle'}
                    onContentChange={(value) =>
                      store.setContent(note.id, value)
                    }
                    onDeleted={() => handleTabChange({ type: 'tasks' })}
                  />
                )
              })()}
          </div>
        </>
      )}
    </div>
  )
}
