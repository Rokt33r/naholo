'use client'

import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  Loader2,
} from 'lucide-react'
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
import { LinkifiedText } from './linkified-text'
import { MarkdownView } from '@/components/ui/markdown-view'
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
    getNextSibling,
    getParent,
    getNextVisibleTask,
    getPreviousVisibleTask,
    openCreateDialog,
    updateTask,
    updateTaskNote,
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

  const [isExpanded, setIsExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(task.name)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteContent, setNoteContent] = useState(task.note ?? '')

  const rowRef = useRef<HTMLDivElement>(null)
  const nameTextareaRef = useRef<HTMLTextAreaElement>(null)
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null)
  const skipBlurSaveRef = useRef(false)

  const hasSubtasks = subtasks.length > 0
  const isCreating = task.id.startsWith('temp-')
  const isFocused = focusedTaskId === task.id
  const previousSibling = useMemo(
    () => getPreviousSibling(task.id),
    [getPreviousSibling, task.id],
  )
  const canIndent = !!previousSibling
  const canOutdent = !!task.parentTaskId
  const noteFirstLine = task.note ? task.note.split('\n')[0] : null

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && nameTextareaRef.current) {
      nameTextareaRef.current.style.height = 'auto'
      nameTextareaRef.current.style.height = `${nameTextareaRef.current.scrollHeight}px`
    }
  }, [name, isEditing])

  // Auto-resize note textarea
  useEffect(() => {
    if (isEditingNote && noteTextareaRef.current) {
      noteTextareaRef.current.style.height = 'auto'
      noteTextareaRef.current.style.height = `${noteTextareaRef.current.scrollHeight}px`
    }
  }, [noteContent, isEditingNote])

  // Focus note textarea when editing starts
  useEffect(() => {
    if (isEditingNote && noteTextareaRef.current) {
      noteTextareaRef.current.focus()
      noteTextareaRef.current.setSelectionRange(
        noteContent.length,
        noteContent.length,
      )
    }
  }, [isEditingNote, noteContent.length])

  // Sync noteContent when task.note changes
  useEffect(() => {
    if (!isEditingNote) {
      setNoteContent(task.note ?? '')
    }
  }, [task.note, isEditingNote])

  // Reset editing state when focus leaves
  useEffect(() => {
    if (!isFocused) {
      setIsEditingNote(false)
    }
  }, [isFocused])

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && nameTextareaRef.current) {
      nameTextareaRef.current.focus()
      nameTextareaRef.current.setSelectionRange(name.length, name.length)
    }
  }, [isEditing, name.length])

  const handleToggleDone = async (checked: boolean) => {
    setIsLoading(true)
    try {
      await setTaskDone(task.id, checked === true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskNameClick = () => {
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
    openCreateDialog(task.id, lastSubtask?.id ?? null)
    setIsExpanded(true)
  }

  const handleSaveNote = async () => {
    const trimmed = noteContent.trim()
    const newNote = trimmed || null
    if (newNote !== task.note) {
      setIsLoading(true)
      try {
        await updateTaskNote(task.id, newNote)
      } finally {
        setIsLoading(false)
      }
    }
    setIsEditingNote(false)
  }

  const handleNoteKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      skipBlurSaveRef.current = true
      const trimmed = noteContent.trim()
      const newNote = trimmed || null
      if (newNote !== task.note) {
        updateTaskNote(task.id, newNote)
      }
      setIsEditingNote(false)
      rowRef.current?.focus()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      skipBlurSaveRef.current = true
      const trimmed = noteContent.trim()
      const newNote = trimmed || null
      if (newNote !== task.note) {
        updateTaskNote(task.id, newNote)
      }
      setIsEditingNote(false)
      setName(task.name)
      setIsEditing(true)
    }
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

  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
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
          if (canOutdent) outdentTask(task.id)
        } else {
          if (canIndent) indentTask(task.id)
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

  const handleTaskNameTextareaKeyDown = (
    e: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
        openCreateDialog(task.parentTaskId, task.id)
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

  const handleFocus = () => {
    setFocusedTaskId(task.id)
  }

  return (
    <div className={cn('group/item', depth > 0 && 'ml-6')}>
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
        <div className='flex items-center py-1'>
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

          {/* Name */}
          <div className='min-h-6 flex-1 overflow-hidden px-2'>
            {isEditing ? (
              <textarea
                ref={nameTextareaRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (skipBlurSaveRef.current) {
                    skipBlurSaveRef.current = false
                    return
                  }
                  handleSave()
                }}
                onKeyDown={handleTaskNameTextareaKeyDown}
                className='block w-full resize-none border-0 bg-transparent p-0 leading-6 outline-none'
                rows={1}
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
          <div className='flex shrink-0 items-center gap-1'>
            {isCreating || isLoading ? (
              <Loader2 className='mx-1 h-4 w-4 animate-spin text-zinc-400' />
            ) : (
              <div className='flex items-center gap-1 opacity-0 group-hover/item:opacity-100'>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6'
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
                      tabIndex={-1}
                    >
                      <MoreVertical className='h-3 w-3' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem onClick={handleTaskNameClick}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => moveUp(task.id)}
                      disabled={!previousSibling}
                    >
                      Move up
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => moveDown(task.id)}>
                      Move down
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => indentTask(task.id)}
                      disabled={!canIndent}
                    >
                      Indent
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => outdentTask(task.id)}
                      disabled={!canOutdent}
                    >
                      Outdent
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className='text-red-600'
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {/* Note section - animated */}
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-200 ease-out',
            isFocused && (task.note || isEditingNote)
              ? 'grid-rows-[1fr]'
              : 'grid-rows-[0fr]',
          )}
        >
          <div className='overflow-hidden'>
            {(task.note || isEditingNote) && (
              <div className='px-2 pb-2 pt-1'>
                {isEditingNote ? (
                  <textarea
                    ref={noteTextareaRef}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    onBlur={() => {
                      if (skipBlurSaveRef.current) {
                        skipBlurSaveRef.current = false
                        return
                      }
                      handleSaveNote()
                    }}
                    onKeyDown={handleNoteKeyDown}
                    placeholder='Add a note... (Markdown supported)'
                    className='min-h-[60px] w-full resize-none rounded border bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-zinc-400'
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingNote(true)}
                    className='cursor-text rounded px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  >
                    <MarkdownView className='text-sm'>
                      {task.note!}
                    </MarkdownView>
                  </div>
                )}
              </div>
            )}
          </div>
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
