'use client'

import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react'
import { ChevronDown, ChevronRight, Plus, MoreVertical } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useTaskContext } from './task-context'
import type { Task } from '@/hooks/use-tasks'

type TaskItemProps = {
  task: Task
  subtasks: Task[]
  depth?: number
}

export function TaskItem({ task, subtasks, depth = 0 }: TaskItemProps) {
  const {
    getSubtasks,
    getPreviousSibling,
    openCreateDialog,
    updateTask,
    setTaskDone,
    deleteTask,
    indentTask,
    outdentTask,
    moveUp,
    moveDown,
    focusedTaskId,
    setFocusedTaskId,
  } = useTaskContext()

  const [isExpanded, setIsExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(task.content)
  const [isLoading, setIsLoading] = useState(false)

  const rowRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasSubtasks = subtasks.length > 0
  const isFocused = focusedTaskId === task.id
  const previousSibling = useMemo(
    () => getPreviousSibling(task.id),
    [getPreviousSibling, task.id],
  )
  const canIndent = !!previousSibling
  const canOutdent = !!task.parentTaskId

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content, isEditing])

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(content.length, content.length)
    }
  }, [isEditing, content.length])

  const handleToggleDone = async (checked: boolean) => {
    setIsLoading(true)
    try {
      await setTaskDone(task.id, checked === true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    setContent(task.content)
    setIsEditing(true)
  }

  const handleSave = async () => {
    const trimmed = content.trim()
    if (trimmed && trimmed !== task.content) {
      setIsLoading(true)
      try {
        await updateTask(task.id, trimmed)
      } finally {
        setIsLoading(false)
      }
    } else {
      setContent(task.content)
    }
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }
    setIsLoading(true)
    try {
      await deleteTask(task.id)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSubtask = () => {
    // Find last subtask to insert after
    const lastSubtask = subtasks[subtasks.length - 1]
    openCreateDialog(task.id, lastSubtask?.id ?? null)
    setIsExpanded(true)
  }

  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Don't handle keys when editing
    if (isEditing) return

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Create new task below
      openCreateDialog(task.parentTaskId, task.id)
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      if (canIndent) {
        indentTask(task.id)
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      if (canOutdent) {
        outdentTask(task.id)
      }
    } else if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault()
      moveUp(task.id)
    } else if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault()
      moveDown(task.id)
    } else if (e.key === 'e' || e.key === 'Enter') {
      // 'e' to edit, or Enter when not creating
      if (e.key === 'e') {
        e.preventDefault()
        handleEdit()
      }
    }
  }

  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setContent(task.content)
      setIsEditing(false)
    }
  }

  const handleFocus = () => {
    setFocusedTaskId(task.id)
  }

  const handleBlur = () => {
    // Don't immediately clear focus to allow for keyboard navigation
  }

  return (
    <div className={cn('group/item', depth > 0 && 'ml-6')}>
      <div
        ref={rowRef}
        tabIndex={0}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleRowKeyDown}
        className={cn(
          'flex items-center gap-2 rounded py-1 outline-none hover:bg-zinc-50 dark:hover:bg-zinc-900',
          isFocused && 'ring-2 ring-blue-500 ring-offset-1',
        )}
      >
        {/* Expand/collapse button */}
        {hasSubtasks ? (
          <Button
            variant='ghost'
            size='icon'
            className='h-5 w-5 shrink-0'
            onClick={() => setIsExpanded(!isExpanded)}
            tabIndex={-1}
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
          tabIndex={-1}
        />

        {/* Content */}
        <div className='min-h-6 flex-1 overflow-hidden'>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleTextareaKeyDown}
              className='block w-full resize-none border-0 bg-transparent p-0 leading-6 outline-none'
              rows={1}
            />
          ) : (
            <span
              className={cn(
                'block cursor-text whitespace-pre-wrap leading-6',
                task.done && 'text-zinc-500 line-through',
              )}
              onClick={handleEdit}
            >
              {task.content}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className='flex shrink-0 items-center gap-1 opacity-0 group-hover/item:opacity-100'>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            disabled={isLoading}
            onClick={handleAddSubtask}
            tabIndex={-1}
          >
            <Plus className='h-3 w-3' />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6'
                disabled={isLoading}
                tabIndex={-1}
              >
                <MoreVertical className='h-3 w-3' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={handleEdit} disabled={isLoading}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => moveUp(task.id)}
                disabled={isLoading || !previousSibling}
              >
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => moveDown(task.id)}
                disabled={isLoading}
              >
                Move down
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => indentTask(task.id)}
                disabled={isLoading || !canIndent}
              >
                Indent
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => outdentTask(task.id)}
                disabled={isLoading || !canOutdent}
              >
                Outdent
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isLoading}
                className='text-red-600'
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Subtasks */}
      {hasSubtasks && isExpanded && (
        <div className='mt-1'>
          {subtasks.map((subtask) => {
            const subtaskChildren = getSubtasks(subtask.id)
            return (
              <TaskItem
                key={subtask.id}
                task={subtask}
                subtasks={subtaskChildren}
                depth={depth + 1}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
