'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, MoreVertical } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAction } from '@/lib/use-action'
import {
  updateTaskAction,
  setTaskDoneAction,
  deleteTaskAction,
} from '@/app/app/actions'
import { CreateTaskDialog } from './create-task-dialog'

type Task = {
  id: string
  content: string
  done: boolean
  parentTaskId: string | null
  position: number
  createdAt: Date
  updatedAt: Date
}

type TaskItemProps = {
  task: Task
  subtasks: Task[]
  allTasks: Task[]
  projectId: string
  issueId: string
  depth?: number
}

export function TaskItem({
  task,
  subtasks,
  allTasks,
  projectId,
  issueId,
  depth = 0,
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(task.content)

  const { execute: updateTask, loading: updateLoading } =
    useAction(updateTaskAction)
  const { execute: setTaskDone, loading: doneLoading } =
    useAction(setTaskDoneAction)
  const { execute: deleteTask, loading: deleteLoading } =
    useAction(deleteTaskAction)

  const hasSubtasks = subtasks.length > 0
  const isLoading = updateLoading || doneLoading || deleteLoading

  const handleToggleDone = async (checked: boolean) => {
    const result = await setTaskDone(
      projectId,
      issueId,
      task.id,
      checked === true,
    )
    if (!result.success) {
      alert('Failed to update task: ' + result.error.message)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (content.trim() && content !== task.content) {
      const result = await updateTask(
        projectId,
        issueId,
        task.id,
        content.trim(),
      )
      if (!result.success) {
        alert('Failed to update task: ' + result.error.message)
        setContent(task.content)
      }
    }
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }
    const result = await deleteTask(projectId, issueId, task.id)
    if (!result.success) {
      alert('Failed to delete task: ' + result.error.message)
    }
  }

  const getSubtasksForTask = (taskId: string) =>
    allTasks
      .filter((t) => t.parentTaskId === taskId)
      .sort((a, b) => a.position - b.position)

  return (
    <div className={cn('group', depth > 0 && 'ml-6')}>
      <div className='flex items-center gap-2 rounded py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900'>
        {/* Expand/collapse button */}
        {hasSubtasks ? (
          <Button
            variant='ghost'
            size='icon'
            className='h-5 w-5 shrink-0'
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className='h-3 w-3' />
            ) : (
              <ChevronRight className='h-3 w-3' />
            )}
          </Button>
        ) : (
          <div className='h-5 w-5 shrink-0' />
        )}

        {/* Checkbox */}
        <Checkbox
          checked={task.done}
          onCheckedChange={handleToggleDone}
          disabled={isLoading}
          className='shrink-0'
        />

        {/* Content */}
        <div className='flex-1 overflow-hidden'>
          {isEditing ? (
            <input
              type='text'
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave()
                } else if (e.key === 'Escape') {
                  setContent(task.content)
                  setIsEditing(false)
                }
              }}
              className='w-full bg-transparent outline-none'
              autoFocus
            />
          ) : (
            <span
              className={cn(
                'cursor-text',
                task.done && 'text-zinc-500 line-through',
              )}
              onClick={handleEdit}
            >
              {task.content}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className='flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100'>
          <CreateTaskDialog
            projectId={projectId}
            issueId={issueId}
            parentTaskId={task.id}
          >
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6'
              disabled={isLoading}
            >
              <Plus className='h-3 w-3' />
            </Button>
          </CreateTaskDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6'
                disabled={isLoading}
              >
                <MoreVertical className='h-3 w-3' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={handleEdit} disabled={isLoading}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={deleteLoading}
                className='text-red-600'
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Subtasks */}
      {hasSubtasks && isExpanded && (
        <div className='mt-1'>
          {subtasks.map((subtask) => (
            <TaskItem
              key={subtask.id}
              task={subtask}
              subtasks={getSubtasksForTask(subtask.id)}
              allTasks={allTasks}
              projectId={projectId}
              issueId={issueId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
