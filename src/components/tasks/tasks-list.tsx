'use client'

import { TaskProvider, useTaskContext } from './task-context'
import { TaskItem } from './task-item'
import { CreateTaskDialog } from './create-task-dialog'

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
    getRootTasks,
    getSubtasks,
    tasks,
    creationDialogState,
    openCreateDialog,
    closeCreateDialog,
    createTask,
  } = useTaskContext()

  const rootTasks = getRootTasks()

  const handleAddTaskClick = () => {
    const lastRootTask = rootTasks[rootTasks.length - 1]
    openCreateDialog(null, lastRootTask?.id ?? null)
  }

  const handleDialogSubmit = async (content: string) => {
    if (!creationDialogState) return

    // Calculate position based on afterTaskId
    let position: number | undefined
    if (creationDialogState.afterTaskId) {
      const afterTask = tasks.find(
        (t) => t.id === creationDialogState.afterTaskId,
      )
      if (afterTask) {
        position = afterTask.position + 1
      }
    } else {
      // Beginning of the list
      position = 0
    }

    await createTask(content, creationDialogState.parentTaskId, position)
    closeCreateDialog()
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
    <div className='p-4'>
      <CreateTaskDialog
        open={!!creationDialogState}
        onOpenChange={(open) => !open && closeCreateDialog()}
        parentTaskId={creationDialogState?.parentTaskId ?? null}
        onSubmit={handleDialogSubmit}
      />

      <div className='mb-3'>
        <h2 className='text-sm font-semibold uppercase tracking-wide text-zinc-500'>
          Tasks
        </h2>
      </div>

      {rootTasks.length === 0 ? (
        <div
          className='cursor-pointer rounded-md py-8 text-center text-sm text-zinc-500 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900'
          onClick={handleAddTaskClick}
        >
          Click to add a task...
        </div>
      ) : (
        <>
          <div className='space-y-1'>
            {rootTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                subtasks={getSubtasks(task.id)}
                depth={0}
              />
            ))}
          </div>

          {/* Bottom click area for adding new task */}
          <div
            className='mt-3 cursor-pointer rounded-md border border-dashed border-zinc-200 py-3 text-center text-sm text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-500 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900'
            onClick={handleAddTaskClick}
          >
            Click to add a task...
          </div>
        </>
      )}
    </div>
  )
}
