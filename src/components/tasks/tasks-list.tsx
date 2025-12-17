'use client'

import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskItem } from './task-item'
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

type TasksListProps = {
  projectId: string
  issueId: string
  tasks: Task[]
}

export function TasksList({ projectId, issueId, tasks }: TasksListProps) {
  // Separate root tasks (no parent) from subtasks
  const rootTasks = tasks
    .filter((task) => !task.parentTaskId)
    .sort((a, b) => a.position - b.position)

  const getSubtasks = (parentId: string) =>
    tasks
      .filter((task) => task.parentTaskId === parentId)
      .sort((a, b) => a.position - b.position)

  return (
    <div className='p-4'>
      <div className='mb-3'>
        <h2 className='text-sm font-semibold uppercase tracking-wide text-zinc-500'>
          Tasks
        </h2>
      </div>

      {rootTasks.length === 0 ? (
        <div className='py-8 text-center text-sm text-zinc-500'>
          No tasks yet. Click "Add task" to create one.
        </div>
      ) : (
        <>
          <div className='space-y-1'>
            {rootTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                subtasks={getSubtasks(task.id)}
                allTasks={tasks}
                projectId={projectId}
                issueId={issueId}
              />
            ))}
          </div>
        </>
      )}

      <div className='mt-3'>
        <CreateTaskDialog projectId={projectId} issueId={issueId}>
          <Button size='sm' variant='outline' className='w-full'>
            <Plus className='mr-1 h-4 w-4' />
            Add task
          </Button>
        </CreateTaskDialog>
      </div>
    </div>
  )
}
