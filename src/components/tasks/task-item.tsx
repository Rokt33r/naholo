'use client'

import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

import { useTaskContext } from './task-context'
import { TaskActions } from './task-actions'
import { TaskNote } from './task-note'
import { LinkifiedText } from './linkified-text'
import type { Task } from '@/hooks/use-tasks'

type TaskItemProps = {
  task: Task
  depth?: number
}

export function TaskItem({ task, depth = 0 }: TaskItemProps) {
  const {
    getSubtasks,
    getPreviousSibling,
    getNextSibling,
    getParent,
    getNextVisibleTask,
    getPreviousVisibleTask,
    openNewTaskItem,
    updateTask,
    setTaskDone,
    deleteTask,
    indentTask,
    outdentTask,
    moveUp,
    moveDown,
    isListFocused,
    focusedTaskId,
    setFocusedTaskId,
  } = useTaskContext()

  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(task.name)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditingNote, setIsEditingNote] = useState(false)

  const rowRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const skipBlurSaveRef = useRef(false)

  const subtasks = getSubtasks(task.id)
  const isCreating = task.id.startsWith('temp-')
  const isFocused = focusedTaskId === task.id
  const previousSibling = useMemo(
    () => getPreviousSibling(task.id),
    [getPreviousSibling, task.id],
  )
  const canIndent = !!previousSibling
  const canOutdent = !!task.parentTaskId
  const noteFirstLine = task.note ? task.note.split('\n')[0] : null

  // Reset editing state when focus leaves
  useEffect(() => {
    if (!isFocused) {
      setIsEditingNote(false)
    }
  }, [isFocused])

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.setSelectionRange(name.length, name.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  const handleToggleDone = async (checked: boolean) => {
    setIsLoading(true)
    try {
      await setTaskDone(task.id, checked === true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskNameClick = () => {
    setFocusedTaskId(task.id)
    setName(task.name)
    setIsEditing(true)
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== task.name) {
      setIsLoading(true)
      try {
        await updateTask(task.id, trimmed)
      } finally {
        setIsLoading(false)
      }
    } else {
      setName(task.name)
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
    openNewTaskItem(task.id, lastSubtask?.id ?? null)
  }

  const handleDeleteWithFocus = async () => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }
    // Determine focus target before deleting
    const nextSibling = getNextSibling(task.id)
    const parent = getParent(task.id)
    const focusTargetId = nextSibling?.id ?? parent?.id ?? null

    setIsLoading(true)
    try {
      await deleteTask(task.id)
      if (focusTargetId) {
        setFocusedTaskId(focusTargetId)
        requestAnimationFrame(() => {
          const el = document.querySelector(
            `[data-task-id="${focusTargetId}"]`,
          ) as HTMLElement | null
          el?.focus()
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToTask = (direction: 'up' | 'down') => {
    const getTarget =
      direction === 'up' ? getPreviousVisibleTask : getNextVisibleTask
    let target = getTarget(task.id)
    // Skip collapsed (non-rendered) tasks
    while (target) {
      const el = document.querySelector(
        `[data-task-id="${target.id}"]`,
      ) as HTMLElement | null
      if (el) {
        setFocusedTaskId(target.id)
        el.focus()
        return
      }
      target = getTarget(target.id)
    }
  }

  const handleRowKeyDown = async (e: KeyboardEvent<HTMLDivElement>) => {
    // Don't handle keys when editing
    if (isEditing || isEditingNote) return

    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        handleTaskNameClick()
        break

      case 'ArrowUp':
        if (e.altKey) {
          e.preventDefault()
          moveUp(task.id)
        } else {
          e.preventDefault()
          navigateToTask('up')
        }
        break

      case 'ArrowDown':
        if (e.altKey) {
          e.preventDefault()
          moveDown(task.id)
        } else {
          e.preventDefault()
          navigateToTask('down')
        }
        break

      case 'Tab':
        e.preventDefault()
        if (e.shiftKey) {
          if (canOutdent) {
            await outdentTask(task.id)
            requestAnimationFrame(() => {
              const el = document.querySelector(
                `[data-task-id="${task.id}"]`,
              ) as HTMLElement | null
              el?.focus()
            })
          }
        } else {
          if (canIndent) {
            await indentTask(task.id)
            requestAnimationFrame(() => {
              const el = document.querySelector(
                `[data-task-id="${task.id}"]`,
              ) as HTMLElement | null
              el?.focus()
            })
          }
        }
        break

      case 'e':
        e.preventDefault()
        handleTaskNameClick()
        break

      case 'n':
        e.preventDefault()
        if (!isEditingNote) {
          setIsEditingNote(true)
        }
        break

      case 'Backspace':
        if (e.metaKey) {
          e.preventDefault()
          handleDeleteWithFocus()
        }
        break

      case 'Delete':
        e.preventDefault()
        handleDeleteWithFocus()
        break
    }
  }

  const handleTaskNameInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      skipBlurSaveRef.current = true
      const trimmed = name.trim()
      if (trimmed && trimmed !== task.name) {
        updateTask(task.id, trimmed)
      }
      setIsEditing(false)
      if (trimmed) {
        // Create new task at same level, after current task
        openNewTaskItem(task.parentTaskId, task.id)
      } else {
        // Empty name — just exit editing, refocus row
        setName(task.name)
        rowRef.current?.focus()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      skipBlurSaveRef.current = true
      const trimmed = name.trim()
      if (trimmed && trimmed !== task.name) {
        updateTask(task.id, trimmed)
      } else {
        setName(task.name)
      }
      setIsEditing(false)
      rowRef.current?.focus()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      skipBlurSaveRef.current = true
      const trimmed = name.trim()
      if (trimmed && trimmed !== task.name) {
        updateTask(task.id, trimmed)
      } else {
        setName(task.name)
      }
      setIsEditing(false)
      setIsEditingNote(true)
    }
  }

  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.target === rowRef.current) {
      setFocusedTaskId(task.id)
    }
  }

  return (
    <div className='group/item' style={{ paddingLeft: depth * 24 }}>
      <div
        ref={rowRef}
        data-task-id={task.id}
        tabIndex={0}
        onFocus={handleFocus}
        onKeyDown={handleRowKeyDown}
        className={cn(
          'relative rounded outline-none hover:bg-zinc-50 dark:hover:bg-zinc-900',
          isFocused && isListFocused && 'z-10 ring-2 ring-blue-500',
        )}
      >
        {/* Main row */}
        <div className='flex items-start py-1 px-2'>
          {/* Checkbox */}
          <Checkbox
            checked={task.done}
            onCheckedChange={handleToggleDone}
            disabled={isLoading}
            className='mt-1 shrink-0 border-zinc-300 dark:border-zinc-600'
            tabIndex={-1}
          />

          {/* Name */}
          <div className='min-h-6 flex-1 overflow-hidden px-2'>
            {isEditing ? (
              <input
                ref={nameInputRef}
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (skipBlurSaveRef.current) {
                    skipBlurSaveRef.current = false
                    return
                  }
                  handleSave()
                }}
                onKeyDown={handleTaskNameInputKeyDown}
                className='block w-full border-0 bg-transparent p-0 leading-6 outline-none'
              />
            ) : (
              <>
                <span onClick={handleTaskNameClick}>
                  <LinkifiedText
                    text={task.name}
                    className={cn(
                      'block cursor-text whitespace-pre-wrap leading-6',
                      task.done && 'text-zinc-500 line-through',
                    )}
                  />
                </span>
                {task.note && !isFocused && (
                  <div className='truncate text-xs text-muted-foreground'>
                    {noteFirstLine}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <TaskActions
            isCreating={isCreating}
            isLoading={isLoading}
            canIndent={canIndent}
            canOutdent={canOutdent}
            hasPreviousSibling={!!previousSibling}
            onAddSubtask={handleAddSubtask}
            onDelete={handleDelete}
            onMoveUp={() => moveUp(task.id)}
            onMoveDown={() => moveDown(task.id)}
            onIndent={() => indentTask(task.id)}
            onOutdent={() => outdentTask(task.id)}
          />
        </div>

        {/* Note section - animated */}
        <TaskNote
          task={task}
          isFocused={isFocused}
          isEditingNote={isEditingNote}
          setIsEditingNote={setIsEditingNote}
          onStartEditingName={() => {
            setName(task.name)
            setIsEditing(true)
          }}
          rowRef={rowRef}
        />
      </div>
    </div>
  )
}
