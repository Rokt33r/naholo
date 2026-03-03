'use client'

import { KeyboardEvent, useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
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
    setFocusedTaskId,
    newTaskItemState,
  } = useTaskContext()

  const previousFocusedTaskId = newTaskItemState?.previousFocusedTaskId ?? null

  const [name, setName] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const getPosition = () => {
    if (afterTaskId) {
      const siblings = parentTaskId ? getSubtasks(parentTaskId) : getRootTasks()
      const afterTask = siblings.find((t) => t.id === afterTaskId)
      return afterTask ? afterTask.position + 1 : 0
    }
    return 0
  }

  const handleSaveAndFocus = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const newTaskId = await createTask(
      trimmed,
      null,
      parentTaskId,
      getPosition(),
    )
    closeNewTaskItem()
    if (newTaskId) {
      setFocusedTaskId(newTaskId)
      requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-task-id="${newTaskId}"]`,
        ) as HTMLElement | null
        el?.focus()
      })
    }
  }

  const handleSaveQuiet = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    await createTask(trimmed, null, parentTaskId, getPosition())
    closeNewTaskItem()
  }

  const handleCancelAndRestore = () => {
    closeNewTaskItem()
    if (previousFocusedTaskId) {
      setFocusedTaskId(previousFocusedTaskId)
      requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-task-id="${previousFocusedTaskId}"]`,
        ) as HTMLElement | null
        el?.focus()
      })
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (name.trim()) {
        handleSaveAndFocus()
      } else {
        handleCancelAndRestore()
      }
    }
    if (e.key === 'Escape') {
      handleCancelAndRestore()
    }
  }

  return (
    <div style={{ paddingLeft: depth * 24 }}>
      <div
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          'relative flex items-start rounded py-1 px-2',
          isFocused && 'z-10 ring-2 ring-blue-500',
        )}
      >
        <Checkbox
          disabled
          className='mt-1 shrink-0 border-zinc-300 dark:border-zinc-600'
          tabIndex={-1}
        />
        <div className='min-h-6 flex-1 overflow-hidden px-2'>
          <input
            ref={inputRef}
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (name.trim()) {
                handleSaveQuiet()
              } else {
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
