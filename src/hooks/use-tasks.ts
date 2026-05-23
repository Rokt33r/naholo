import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, mutationFetch, createResponseError } from '@/lib/fetcher'
import { updateOperationListCache } from './use-operations'

export type Task = {
  id: string
  parentTaskId: string | null
  name: string
  note: string | null
  done: boolean
  position: number
  createdAt: string
  updatedAt: string
}

/**
 * Hook to fetch tasks for an operation
 */
export function useTasks(projectSlug: string, operationNumber: number) {
  return useQuery({
    queryKey: ['tasks', operationNumber],
    queryFn: () =>
      fetcher<Task[]>(
        `/api/projects/${projectSlug}/operations/${operationNumber}/tasks`,
      ),
    staleTime: 1000 * 60,
  })
}

/**
 * Hook to create an task with optimistic updates
 */
export function useCreateTask(projectSlug: string, operationNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      name,
      note,
      parentTaskId,
      position,
    }: {
      name: string
      note?: string | null
      parentTaskId?: string | null
      position?: number
    }) => {
      const response = await mutationFetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/tasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, note, parentTaskId, position }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to create task')
      }
      return response.json() as Promise<{ id: string }>
    },
    onMutate: async ({ name, note, parentTaskId, position }) => {
      await queryClient.cancelQueries({
        queryKey: ['tasks', operationNumber],
      })

      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        operationNumber,
      ])

      // Calculate position for optimistic update
      const siblings = (previousTasks ?? []).filter(
        (t) => t.parentTaskId === (parentTaskId ?? null),
      )
      const optimisticPosition =
        position ??
        (siblings.length > 0
          ? Math.max(...siblings.map((t) => t.position)) + 1
          : 0)

      const optimisticTask: Task = {
        id: `temp-${Date.now()}`,
        name,
        note: note ?? null,
        parentTaskId: parentTaskId ?? null,
        done: false,
        position: optimisticPosition,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      queryClient.setQueryData<Task[]>(['tasks', operationNumber], (old) => {
        if (position !== undefined) {
          // Shift existing tasks at or after position
          const updated = (old ?? []).map((t) => {
            if (
              t.parentTaskId === (parentTaskId ?? null) &&
              t.position >= position
            ) {
              return { ...t, position: t.position + 1 }
            }
            return t
          })
          return [...updated, optimisticTask]
        }
        return [...(old ?? []), optimisticTask]
      })

      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          totalTasks: operation.totalTasks + 1,
          updatedAt: new Date().toISOString(),
        }),
      )

      return { previousTasks }
    },
    onError: (err, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ['tasks', operationNumber],
          context.previousTasks,
        )
      }
      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          totalTasks: operation.totalTasks - 1,
        }),
      )
      toast.error(err instanceof Error ? err.message : 'Failed to create task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', operationNumber],
      })
    },
  })
}

/**
 * Hook to update an task's content with optimistic updates
 */
export function useUpdateTask(projectSlug: string, operationNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, name }: { taskId: string; name: string }) => {
      const response = await mutationFetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to update task')
      }
      return response.json()
    },
    onMutate: async ({ taskId, name }) => {
      await queryClient.cancelQueries({
        queryKey: ['tasks', operationNumber],
      })

      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        operationNumber,
      ])

      queryClient.setQueryData<Task[]>(['tasks', operationNumber], (old) =>
        old?.map((task) =>
          task.id === taskId
            ? { ...task, name, updatedAt: new Date().toISOString() }
            : task,
        ),
      )

      return { previousTasks }
    },
    onError: (err, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ['tasks', operationNumber],
          context.previousTasks,
        )
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', operationNumber],
      })
    },
  })
}

/**
 * Hook to set task done status with optimistic updates
 */
export function useSetTaskDone(projectSlug: string, operationNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, done }: { taskId: string; done: boolean }) => {
      const response = await mutationFetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ done }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to update task')
      }
      return response.json()
    },
    onMutate: async ({ taskId, done }) => {
      await queryClient.cancelQueries({
        queryKey: ['tasks', operationNumber],
      })

      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        operationNumber,
      ])

      queryClient.setQueryData<Task[]>(['tasks', operationNumber], (old) =>
        old?.map((task) =>
          task.id === taskId
            ? { ...task, done, updatedAt: new Date().toISOString() }
            : task,
        ),
      )

      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          completedTasks: operation.completedTasks + (done ? 1 : -1),
          updatedAt: new Date().toISOString(),
        }),
      )

      return { previousTasks }
    },
    onError: (err, { done }, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ['tasks', operationNumber],
          context.previousTasks,
        )
      }
      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          completedTasks: operation.completedTasks + (done ? -1 : 1),
        }),
      )
      toast.error(err instanceof Error ? err.message : 'Failed to update task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', operationNumber],
      })
    },
  })
}

/**
 * Hook to update an task's note with optimistic updates
 */
export function useUpdateTaskNote(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskId,
      note,
    }: {
      taskId: string
      note: string | null
    }) => {
      const response = await mutationFetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to update task note')
      }
      return response.json()
    },
    onMutate: async ({ taskId, note }) => {
      await queryClient.cancelQueries({
        queryKey: ['tasks', operationNumber],
      })

      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        operationNumber,
      ])

      queryClient.setQueryData<Task[]>(['tasks', operationNumber], (old) =>
        old?.map((task) =>
          task.id === taskId
            ? { ...task, note, updatedAt: new Date().toISOString() }
            : task,
        ),
      )

      return { previousTasks }
    },
    onError: (err, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ['tasks', operationNumber],
          context.previousTasks,
        )
      }
      toast.error(
        err instanceof Error ? err.message : 'Failed to update task note',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', operationNumber],
      })
    },
  })
}

/**
 * Hook to delete an task with optimistic updates
 */
export function useDeleteTask(projectSlug: string, operationNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await mutationFetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/tasks/${taskId}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to delete task')
      }
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({
        queryKey: ['tasks', operationNumber],
      })

      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        operationNumber,
      ])

      // Remove task and all its descendants
      const getDescendantIds = (id: string, tasks: Task[]): string[] => {
        const children = tasks.filter((t) => t.parentTaskId === id)
        return [id, ...children.flatMap((c) => getDescendantIds(c.id, tasks))]
      }

      const allTasks = previousTasks ?? []
      const idsToRemove = getDescendantIds(taskId, allTasks)
      const removedDoneCount = allTasks.filter(
        (t) => idsToRemove.includes(t.id) && t.done,
      ).length

      queryClient.setQueryData<Task[]>(['tasks', operationNumber], (old) =>
        old?.filter((task) => !idsToRemove.includes(task.id)),
      )

      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          totalTasks: operation.totalTasks - idsToRemove.length,
          completedTasks: operation.completedTasks - removedDoneCount,
          updatedAt: new Date().toISOString(),
        }),
      )

      return {
        previousTasks,
        removedCount: idsToRemove.length,
        removedDoneCount,
      }
    },
    onError: (err, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ['tasks', operationNumber],
          context.previousTasks,
        )
      }
      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          totalTasks: operation.totalTasks + (context?.removedCount ?? 0),
          completedTasks:
            operation.completedTasks + (context?.removedDoneCount ?? 0),
        }),
      )
      toast.error(err instanceof Error ? err.message : 'Failed to delete task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', operationNumber],
      })
    },
  })
}

/**
 * Hook to move an task with optimistic updates
 */
export function useMoveTask(projectSlug: string, operationNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskId,
      newParentTaskId,
      newPosition,
    }: {
      taskId: string
      newParentTaskId: string | null
      newPosition: number
    }) => {
      const response = await mutationFetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/tasks/${taskId}/move`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newParentTaskId, newPosition }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to move task')
      }
      return response.json()
    },
    onMutate: async ({ taskId, newParentTaskId, newPosition }) => {
      await queryClient.cancelQueries({
        queryKey: ['tasks', operationNumber],
      })

      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        operationNumber,
      ])

      queryClient.setQueryData<Task[]>(['tasks', operationNumber], (old) => {
        if (!old) return old

        const task = old.find((t) => t.id === taskId)
        if (!task) return old

        const oldParentId = task.parentTaskId
        const oldPosition = task.position

        // Same location - no change needed
        if (oldParentId === newParentTaskId && oldPosition === newPosition) {
          return old
        }

        const sameParent = oldParentId === newParentTaskId

        return old.map((t) => {
          // Update the moved task
          if (t.id === taskId) {
            return {
              ...t,
              parentTaskId: newParentTaskId,
              position: newPosition,
              updatedAt: new Date().toISOString(),
            }
          }

          if (sameParent) {
            // Same parent - reorder siblings
            if (t.parentTaskId !== oldParentId) return t

            if (oldPosition < newPosition) {
              // Moving down
              if (t.position > oldPosition && t.position <= newPosition) {
                return { ...t, position: t.position - 1 }
              }
            } else {
              // Moving up
              if (t.position >= newPosition && t.position < oldPosition) {
                return { ...t, position: t.position + 1 }
              }
            }
          } else {
            // Different parent - adjust both locations
            // Close gap at old location
            if (t.parentTaskId === oldParentId && t.position > oldPosition) {
              return { ...t, position: t.position - 1 }
            }
            // Make room at new location
            if (
              t.parentTaskId === newParentTaskId &&
              t.position >= newPosition
            ) {
              return { ...t, position: t.position + 1 }
            }
          }

          return t
        })
      })

      return { previousTasks }
    },
    onError: (err, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ['tasks', operationNumber],
          context.previousTasks,
        )
      }
      toast.error(err instanceof Error ? err.message : 'Failed to move task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', operationNumber],
      })
    },
  })
}
