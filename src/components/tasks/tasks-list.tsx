'use client'

import { KeyboardEvent, useRef, useState, useEffect } from 'react'
import { TaskProvider, useTaskContext } from './task-context'
import { TaskItem } from './task-item'

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
  const { isLoading, getRootTasks, getSubtasks, createTask } = useTaskContext()

  const rootTasks = getRootTasks()

  const [isCreating, setIsCreating] = useState(false)
  const [newTaskContent, setNewTaskContent] = useState('')
  const newTaskInputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus when input appears
  useEffect(() => {
    if (isCreating && newTaskInputRef.current) {
      newTaskInputRef.current.focus()
    }
  }, [isCreating])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = newTaskInputRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [newTaskContent])

  const handleCreateTask = async () => {
    const content = newTaskContent.trim()
    if (!content) return

    // Calculate position (after last root task)
    const lastRootTask = rootTasks[rootTasks.length - 1]
    const position = lastRootTask ? lastRootTask.position + 1 : 0

    await createTask(content, null, position)
    setNewTaskContent('') // Reset for next task
    // Keep isCreating true for continuous entry
    newTaskInputRef.current?.focus()
  }

  const handleBottomClick = () => {
    if (!isCreating) {
      // Not creating → show input
      setIsCreating(true)
    } else if (newTaskContent.trim() === '') {
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
      if (newTaskContent.trim()) {
        handleCreateTask()
      } else {
        setIsCreating(false)
      }
    }
    if (e.key === 'Escape') {
      setIsCreating(false)
      setNewTaskContent('')
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
    <div className='flex h-full flex-col p-4'>
      <div className='mb-3'>
        <h2 className='text-sm font-semibold uppercase tracking-wide text-zinc-500'>
          Tasks
        </h2>
      </div>

      {/* Task list */}
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
        <div className='flex items-start gap-2 rounded py-1'>
          {/* Expand/collapse placeholder */}
          <div className='h-5 w-5 shrink-0' />
          {/* Checkbox placeholder */}
          <div className='h-4 w-4 shrink-0' />
          <textarea
            ref={newTaskInputRef}
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='New task...'
            className='flex-1 resize-none bg-transparent outline-none'
            rows={1}
          />
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
