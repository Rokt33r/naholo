import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type Task = {
  id: string
  parentTaskId: string | null
  name: string
  note: string | null
  done: boolean
  position: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Hook to fetch tasks for an issue
 */
export function useTasks(projectId: string, issueId: string) {
  return useQuery({
    queryKey: ['tasks', issueId],
    queryFn: () =>
      fetcher<Task[]>(`/api/projects/${projectId}/issues/${issueId}/tasks`),
    staleTime: 1000 * 60,
  })
}

/**
 * Hook to create a task with optimistic updates
 */
export function useCreateTask(projectId: string, issueId: string) {
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
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueId}/tasks`,
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
      await queryClient.cancelQueries({ queryKey: ['tasks', issueId] })

      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', issueId])

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
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      queryClient.setQueryData<Task[]>(['tasks', issueId], (old) => {
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

      return { previousTasks }
    },
    onError: (err, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', issueId], context.previousTasks)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to create task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', issueId] })
    },
  })
}

/**
 * Hook to update a task's content with optimistic updates
 */
export function useUpdateTask(projectId: string, issueId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, name }: { taskId: string; name: string }) => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueId}/tasks/${taskId}`,
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
      await queryClient.cancelQueries({ queryKey: ['tasks', issueId] })

      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', issueId])

      queryClient.setQueryData<Task[]>(['tasks', issueId], (old) =>
        old?.map((task) =>
          task.id === taskId ? { ...task, name, updatedAt: new Date() } : task,
        ),
      )

      return { previousTasks }
    },
    onError: (err, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', issueId], context.previousTasks)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', issueId] })
    },
  })
}

/**
 * Hook to set task done status with optimistic updates
 */
export function useSetTaskDone(projectId: string, issueId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, done }: { taskId: string; done: boolean }) => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueId}/tasks/${taskId}`,
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
      await queryClient.cancelQueries({ queryKey: ['tasks', issueId] })

      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', issueId])

      queryClient.setQueryData<Task[]>(['tasks', issueId], (old) =>
        old?.map((task) =>
          task.id === taskId ? { ...task, done, updatedAt: new Date() } : task,
        ),
      )

      return { previousTasks }
    },
    onError: (err, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', issueId], context.previousTasks)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', issueId] })
    },
  })
}

/**
 * Hook to update a task's note with optimistic updates
 */
export function useUpdateTaskNote(projectId: string, issueId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskId,
      note,
    }: {
      taskId: string
      note: string | null
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueId}/tasks/${taskId}`,
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
      await queryClient.cancelQueries({ queryKey: ['tasks', issueId] })

      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', issueId])

      queryClient.setQueryData<Task[]>(['tasks', issueId], (old) =>
        old?.map((task) =>
          task.id === taskId ? { ...task, note, updatedAt: new Date() } : task,
        ),
      )

      return { previousTasks }
    },
    onError: (err, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', issueId], context.previousTasks)
      }
      toast.error(
        err instanceof Error ? err.message : 'Failed to update task note',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', issueId] })
    },
  })
}

/**
 * Hook to delete a task with optimistic updates
 */
export function useDeleteTask(projectId: string, issueId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueId}/tasks/${taskId}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to delete task')
      }
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', issueId] })

      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', issueId])

      // Remove task and all its descendants
      const getDescendantIds = (id: string, tasks: Task[]): string[] => {
        const children = tasks.filter((t) => t.parentTaskId === id)
        return [id, ...children.flatMap((c) => getDescendantIds(c.id, tasks))]
      }

      const idsToRemove = getDescendantIds(taskId, previousTasks ?? [])

      queryClient.setQueryData<Task[]>(['tasks', issueId], (old) =>
        old?.filter((task) => !idsToRemove.includes(task.id)),
      )

      return { previousTasks }
    },
    onError: (err, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', issueId], context.previousTasks)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', issueId] })
    },
  })
}

/**
 * Hook to move a task with optimistic updates
 */
export function useMoveTask(projectId: string, issueId: string) {
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
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueId}/tasks/${taskId}/move`,
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
      await queryClient.cancelQueries({ queryKey: ['tasks', issueId] })

      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', issueId])

      queryClient.setQueryData<Task[]>(['tasks', issueId], (old) => {
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
              updatedAt: new Date(),
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
        queryClient.setQueryData(['tasks', issueId], context.previousTasks)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to move task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', issueId] })
    },
  })
}
