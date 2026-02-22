'use client'

import {
  KeyboardEvent,
  useRef,
  useState,
  useEffect,
  type FocusEvent,
} from 'react'
import { TaskProvider, useTaskContext } from './task-context'
import { TaskItem } from './task-item'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'

type TasksListProps = {
  projectId: string
  issueId: string
}

export function TasksList({ projectId, issueId }: TasksListProps) {
  return (
    <TaskProvider projectId={projectId} issueId={issueId}>
      <TasksListContent />
    </TaskProvider>
  )
}

function TasksListContent() {
  const { isLoading, getRootTasks, getSubtasks, createTask, setIsListFocused } =
    useTaskContext()

  const containerRef = useRef<HTMLDivElement>(null)

  const handleContainerFocus = () => {
    setIsListFocused(true)
  }

  const handleContainerBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (
      containerRef.current &&
      e.relatedTarget instanceof Node &&
      containerRef.current.contains(e.relatedTarget)
    ) {
      return
    }
    setIsListFocused(false)
  }

  const rootTasks = getRootTasks()

  const [isCreating, setIsCreating] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskNote, setNewTaskNote] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const newTaskInputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus when input appears
  useEffect(() => {
    if (isCreating && newTaskInputRef.current) {
      newTaskInputRef.current.focus()
    }
  }, [isCreating])

  const handleCreateTask = async () => {
    const name = newTaskName.trim()
    if (!name) return

    // Calculate position (after last root task)
    const lastRootTask = rootTasks[rootTasks.length - 1]
    const position = lastRootTask ? lastRootTask.position + 1 : 0

    const note = newTaskNote.trim() || null
    await createTask(name, note, null, position)
    setNewTaskName('') // Reset for next task
    setNewTaskNote('')
    setShowNoteInput(false)
    // Keep isCreating true for continuous entry
    newTaskInputRef.current?.focus()
  }

  const handleBottomClick = () => {
    if (!isCreating) {
      // Not creating → show input
      setIsCreating(true)
    } else if (newTaskName.trim() === '') {
      // Creating but empty → hide input
      setIsCreating(false)
    } else {
      // Creating with content → create task, show fresh input
      handleCreateTask()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (newTaskName.trim()) {
        handleCreateTask()
      } else {
        setIsCreating(false)
      }
    }
    if (e.key === 'Escape') {
      setIsCreating(false)
      setNewTaskName('')
    }
  }

  if (isLoading) {
    return (
      <div className='p-4'>
        <div className='mb-3'>
          <h2 className='text-sm font-semibold uppercase tracking-wide text-zinc-500'>
            Tasks
          </h2>
        </div>
        <div className='py-8 text-center text-sm text-zinc-500'>Loading...</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className='flex h-full flex-col p-4 overflow-auto'
      onFocus={handleContainerFocus}
      onBlur={handleContainerBlur}
    >
      <div>
        {rootTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            subtasks={getSubtasks(task.id)}
            depth={0}
          />
        ))}
      </div>

      {/* Inline input (when creating) */}
      {isCreating && (
        <div>
          <div className='flex items-start gap-2 rounded py-1'>
            {/* Expand/collapse placeholder */}
            <div className='h-5 w-5 shrink-0' />
            {/* Checkbox placeholder */}
            <div className='h-4 w-4 shrink-0' />
            <div className='flex-1'>
              <AutoResizeTextarea
                ref={newTaskInputRef}
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='New task...'
                className='w-full resize-none bg-transparent outline-none'
                rows={1}
              />
              {showNoteInput && (
                <textarea
                  value={newTaskNote}
                  onChange={(e) => setNewTaskNote(e.target.value)}
                  placeholder='Note (Markdown supported)'
                  className='mt-1 min-h-[40px] w-full resize-none rounded border bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-zinc-400'
                  rows={2}
                />
              )}
              <button
                type='button'
                onClick={() => setShowNoteInput(!showNoteInput)}
                className='mt-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              >
                {showNoteInput ? 'Hide note' : 'Add note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clickable bottom area */}
      <div
        className='min-h-[100px] flex-1 cursor-text'
        onClick={handleBottomClick}
      />
    </div>
  )
}
