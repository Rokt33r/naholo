'use client'

import { KeyboardEvent, useRef, useState, useEffect } from 'react'
import { useTaskContext } from './task-context'

type NewTaskItemProps = {
  depth: number
  parentTaskId: string | null
  afterTaskId: string | null
}

export function NewTaskItem({
  depth,
  parentTaskId,
  afterTaskId,
}: NewTaskItemProps) {
  const {
    createTask,
    getSubtasks,
    getRootTasks,
    closeNewTaskItem,
    openNewTaskItem,
  } = useTaskContext()

  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return

    // Calculate position
    let position: number
    if (afterTaskId) {
      const siblings = parentTaskId ? getSubtasks(parentTaskId) : getRootTasks()
      const afterTask = siblings.find((t) => t.id === afterTaskId)
      position = afterTask ? afterTask.position + 1 : 0
    } else {
      position = 0
    }

    const newTaskId = await createTask(trimmed, null, parentTaskId, position)
    setName('')
    if (newTaskId) {
      // Continue creating at same level, after the new task
      openNewTaskItem(parentTaskId, newTaskId)
    }
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (name.trim()) {
        handleCreate()
      } else {
        closeNewTaskItem()
      }
    }
    if (e.key === 'Escape') {
      closeNewTaskItem()
    }
  }

  return (
    <div style={{ paddingLeft: depth * 24 }}>
      <div className='flex items-start gap-2 rounded py-1'>
        {/* Expand/collapse placeholder */}
        <div className='h-5 w-5 shrink-0' />
        {/* Checkbox placeholder */}
        <div className='h-4 w-4 shrink-0' />
        <div className='min-h-6 flex-1 overflow-hidden px-2'>
          <input
            ref={inputRef}
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!name.trim()) {
                closeNewTaskItem()
              }
            }}
            placeholder='New task...'
            className='block w-full border-0 bg-transparent p-0 leading-6 outline-none'
          />
        </div>
      </div>
    </div>
  )
}
