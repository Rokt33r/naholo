'use client'

import { useRef, type FocusEvent } from 'react'
import { TaskProvider, useTaskContext } from './task-context'
import { TaskItem } from './task-item'
import { NewTaskItem } from './new-task-item'

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
  const {
    isLoading,
    getFlattenedTasks,
    getRootTasks,
    setIsListFocused,
    newTaskItemState,
    openNewTaskItem,
  } = useTaskContext()

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

  const flattenedTasks = getFlattenedTasks()
  const rootTasks = getRootTasks()

  const handleBottomClick = () => {
    if (!newTaskItemState) {
      const lastRootTask = rootTasks[rootTasks.length - 1]
      openNewTaskItem(null, lastRootTask?.id ?? null)
    }
  }

  // Build the flat render list: tasks + optional creation input
  const renderItems: Array<
    | {
        type: 'task'
        task: (typeof flattenedTasks)[0]['task']
        depth: number
        key: string
      }
    | {
        type: 'creation'
        depth: number
        parentTaskId: string | null
        afterTaskId: string | null
        key: string
      }
  > = []

  for (const { task, depth } of flattenedTasks) {
    renderItems.push({ type: 'task', task, depth, key: task.id })
  }

  // Insert creation input at the right position
  if (newTaskItemState) {
    const { parentTaskId, afterTaskId } = newTaskItemState
    const creationDepth = parentTaskId
      ? (flattenedTasks.find((ft) => ft.task.id === parentTaskId)?.depth ?? 0) +
        1
      : 0

    if (afterTaskId) {
      // Find the index after the afterTask and all its descendants
      const afterIndex = renderItems.findIndex(
        (item) => item.type === 'task' && item.key === afterTaskId,
      )
      if (afterIndex !== -1) {
        // Skip past all descendants (items with greater depth immediately after)
        let insertIndex = afterIndex + 1
        const afterDepth = renderItems[afterIndex].depth
        while (
          insertIndex < renderItems.length &&
          renderItems[insertIndex].depth > afterDepth
        ) {
          insertIndex++
        }
        renderItems.splice(insertIndex, 0, {
          type: 'creation',
          depth: creationDepth,
          parentTaskId,
          afterTaskId,
          key: 'creation-input',
        })
      } else {
        // afterTask not visible (collapsed), append at end
        renderItems.push({
          type: 'creation',
          depth: creationDepth,
          parentTaskId,
          afterTaskId,
          key: 'creation-input',
        })
      }
    } else {
      // No afterTaskId — insert at beginning of parent's children
      if (parentTaskId) {
        const parentIndex = renderItems.findIndex(
          (item) => item.type === 'task' && item.key === parentTaskId,
        )
        renderItems.splice(parentIndex + 1, 0, {
          type: 'creation',
          depth: creationDepth,
          parentTaskId,
          afterTaskId,
          key: 'creation-input',
        })
      } else {
        // Root level, beginning
        renderItems.splice(0, 0, {
          type: 'creation',
          depth: 0,
          parentTaskId: null,
          afterTaskId: null,
          key: 'creation-input',
        })
      }
    }
  }

  if (!isLoading && flattenedTasks.length === 0 && !newTaskItemState) {
    return (
      <div
        className='flex h-full flex-col items-center justify-center px-2 py-4 text-center cursor-text'
        onClick={() => openNewTaskItem(null, null)}
      >
        <p className='text-sm text-zinc-500'>
          Click here to break this issue into tasks
        </p>
      </div>
    )
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
      className='flex h-full flex-col py-4 px-2 overflow-auto'
      onFocus={handleContainerFocus}
      onBlur={handleContainerBlur}
    >
      <div>
        {renderItems.map((item) => {
          if (item.type === 'task') {
            return (
              <TaskItem key={item.key} task={item.task} depth={item.depth} />
            )
          }
          return (
            <NewTaskItem
              key={item.key}
              depth={item.depth}
              parentTaskId={item.parentTaskId}
              afterTaskId={item.afterTaskId}
            />
          )
        })}
      </div>

      {/* Clickable bottom area */}
      <div
        className='min-h-[100px] flex-1 cursor-text'
        onClick={handleBottomClick}
      />
    </div>
  )
}
