import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type { Task } from 'naholo-api/types'

import type { Task } from 'naholo-api/types'
import { updateIssueListCache } from './use-issues'

/**
 * Hook to fetch tasks for an issue
 */
export function useTasks(projectSlug: string, issueNumber: number) {
  return useQuery({
    queryKey: ['tasks', issueNumber],
    queryFn: () =>
      fetcher<Task[]>(
        `/api/projects/${projectSlug}/issues/${issueNumber}/tasks`,
      ),
    staleTime: 1000 * 60,
  })
}

/**
 * Hook to create a task with optimistic updates
 */
export function useCreateTask(projectSlug: string, issueNumber: number) {
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
        `/api/projects/${projectSlug}/issues/${issueNumber}/tasks`,
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
      await queryClient.cancelQueries({ queryKey: ['tasks', issueNumber] })

      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        issueNumber,
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

      queryClient.setQueryData<Task[]>(['tasks', issueNumber], (old) => {
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

      updateIssueListCache(queryClient, projectSlug, issueNumber, (issue) => ({
        ...issue,
        totalTasks: issue.totalTasks + 1,
        updatedAt: new Date().toISOString(),
      }))

      return { previousTasks }
    },
    onError: (err, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', issueNumber], context.previousTasks)
      }
      updateIssueListCache(queryClient, projectSlug, issueNumber, (issue) => ({
        ...issue,
        totalTasks: issue.totalTasks - 1,
      }))
      toast.error(err instanceof Error ? err.message : 'Failed to create task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', issueNumber] })
    },
  })
}

/**
 * Hook to update a task's content with optimistic updates
 */
export function useUpdateTask(projectSlug: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, name }: { taskId: string; name: string }) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/issues/${issueNumber}/tasks/${taskId}`,
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
      await queryClient.cancelQueries({ queryKey: ['tasks', issueNumber] })

      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        issueNumber,
      ])

      queryClient.setQueryData<Task[]>(['tasks', issueNumber], (old) =>
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
        queryClient.setQueryData(['tasks', issueNumber], context.previousTasks)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', issueNumber] })
    },
  })
}

/**
 * Hook to set task done status with optimistic updates
 */
export function useSetTaskDone(projectSlug: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, done }: { taskId: string; done: boolean }) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/issues/${issueNumber}/tasks/${taskId}`,
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
      await queryClient.cancelQueries({ queryKey: ['tasks', issueNumber] })

      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        issueNumber,
      ])

      queryClient.setQueryData<Task[]>(['tasks', issueNumber], (old) =>
        old?.map((task) =>
          task.id === taskId
            ? { ...task, done, updatedAt: new Date().toISOString() }
            : task,
        ),
      )

      updateIssueListCache(queryClient, projectSlug, issueNumber, (issue) => ({
        ...issue,
        completedTasks: issue.completedTasks + (done ? 1 : -1),
        updatedAt: new Date().toISOString(),
      }))

      return { previousTasks }
    },
    onError: (err, { done }, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', issueNumber], context.previousTasks)
      }
      updateIssueListCache(queryClient, projectSlug, issueNumber, (issue) => ({
        ...issue,
        completedTasks: issue.completedTasks + (done ? -1 : 1),
      }))
      toast.error(err instanceof Error ? err.message : 'Failed to update task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', issueNumber] })
    },
  })
}

/**
 * Hook to update a task's note with optimistic updates
 */
export function useUpdateTaskNote(projectSlug: string, issueNumber: number) {
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
        `/api/projects/${projectSlug}/issues/${issueNumber}/tasks/${taskId}`,
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
      await queryClient.cancelQueries({ queryKey: ['tasks', issueNumber] })

      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        issueNumber,
      ])

      queryClient.setQueryData<Task[]>(['tasks', issueNumber], (old) =>
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
        queryClient.setQueryData(['tasks', issueNumber], context.previousTasks)
      }
      toast.error(
        err instanceof Error ? err.message : 'Failed to update task note',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', issueNumber] })
    },
  })
}

/**
 * Hook to delete a task with optimistic updates
 */
export function useDeleteTask(projectSlug: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/issues/${issueNumber}/tasks/${taskId}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to delete task')
      }
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', issueNumber] })

      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        issueNumber,
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

      queryClient.setQueryData<Task[]>(['tasks', issueNumber], (old) =>
        old?.filter((task) => !idsToRemove.includes(task.id)),
      )

      updateIssueListCache(queryClient, projectSlug, issueNumber, (issue) => ({
        ...issue,
        totalTasks: issue.totalTasks - idsToRemove.length,
        completedTasks: issue.completedTasks - removedDoneCount,
        updatedAt: new Date().toISOString(),
      }))

      return {
        previousTasks,
        removedCount: idsToRemove.length,
        removedDoneCount,
      }
    },
    onError: (err, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', issueNumber], context.previousTasks)
      }
      updateIssueListCache(queryClient, projectSlug, issueNumber, (issue) => ({
        ...issue,
        totalTasks: issue.totalTasks + (context?.removedCount ?? 0),
        completedTasks: issue.completedTasks + (context?.removedDoneCount ?? 0),
      }))
      toast.error(err instanceof Error ? err.message : 'Failed to delete task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', issueNumber] })
    },
  })
}

/**
 * Hook to move a task with optimistic updates
 */
export function useMoveTask(projectSlug: string, issueNumber: number) {
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
        `/api/projects/${projectSlug}/issues/${issueNumber}/tasks/${taskId}/move`,
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
      await queryClient.cancelQueries({ queryKey: ['tasks', issueNumber] })

      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        issueNumber,
      ])

      queryClient.setQueryData<Task[]>(['tasks', issueNumber], (old) => {
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
        queryClient.setQueryData(['tasks', issueNumber], context.previousTasks)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to move task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', issueNumber] })
    },
  })
}
