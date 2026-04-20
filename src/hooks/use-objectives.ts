import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'
import { updateOperationListCache } from './use-operations'

export type Objective = {
  id: string
  parentObjectiveId: string | null
  name: string
  note: string | null
  done: boolean
  position: number
  createdAt: string
  updatedAt: string
}

/**
 * Hook to fetch objectives for an operation
 */
export function useObjectives(projectSlug: string, operationNumber: number) {
  return useQuery({
    queryKey: ['objectives', operationNumber],
    queryFn: () =>
      fetcher<Objective[]>(
        `/api/projects/${projectSlug}/operations/${operationNumber}/objectives`,
      ),
    staleTime: 1000 * 60,
  })
}

/**
 * Hook to create an objective with optimistic updates
 */
export function useCreateObjective(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      name,
      note,
      parentObjectiveId,
      position,
    }: {
      name: string
      note?: string | null
      parentObjectiveId?: string | null
      position?: number
    }) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/objectives`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, note, parentObjectiveId, position }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to create objective')
      }
      return response.json() as Promise<{ id: string }>
    },
    onMutate: async ({ name, note, parentObjectiveId, position }) => {
      await queryClient.cancelQueries({
        queryKey: ['objectives', operationNumber],
      })

      const previousObjectives = queryClient.getQueryData<Objective[]>([
        'objectives',
        operationNumber,
      ])

      // Calculate position for optimistic update
      const siblings = (previousObjectives ?? []).filter(
        (t) => t.parentObjectiveId === (parentObjectiveId ?? null),
      )
      const optimisticPosition =
        position ??
        (siblings.length > 0
          ? Math.max(...siblings.map((t) => t.position)) + 1
          : 0)

      const optimisticObjective: Objective = {
        id: `temp-${Date.now()}`,
        name,
        note: note ?? null,
        parentObjectiveId: parentObjectiveId ?? null,
        done: false,
        position: optimisticPosition,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      queryClient.setQueryData<Objective[]>(
        ['objectives', operationNumber],
        (old) => {
          if (position !== undefined) {
            // Shift existing objectives at or after position
            const updated = (old ?? []).map((t) => {
              if (
                t.parentObjectiveId === (parentObjectiveId ?? null) &&
                t.position >= position
              ) {
                return { ...t, position: t.position + 1 }
              }
              return t
            })
            return [...updated, optimisticObjective]
          }
          return [...(old ?? []), optimisticObjective]
        },
      )

      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          totalObjectives: operation.totalObjectives + 1,
          updatedAt: new Date().toISOString(),
        }),
      )

      return { previousObjectives }
    },
    onError: (err, _, context) => {
      if (context?.previousObjectives) {
        queryClient.setQueryData(
          ['objectives', operationNumber],
          context.previousObjectives,
        )
      }
      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          totalObjectives: operation.totalObjectives - 1,
        }),
      )
      toast.error(
        err instanceof Error ? err.message : 'Failed to create objective',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['objectives', operationNumber],
      })
    },
  })
}

/**
 * Hook to update an objective's content with optimistic updates
 */
export function useUpdateObjective(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      objectiveId,
      name,
    }: {
      objectiveId: string
      name: string
    }) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/objectives/${objectiveId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to update objective')
      }
      return response.json()
    },
    onMutate: async ({ objectiveId, name }) => {
      await queryClient.cancelQueries({
        queryKey: ['objectives', operationNumber],
      })

      const previousObjectives = queryClient.getQueryData<Objective[]>([
        'objectives',
        operationNumber,
      ])

      queryClient.setQueryData<Objective[]>(
        ['objectives', operationNumber],
        (old) =>
          old?.map((objective) =>
            objective.id === objectiveId
              ? { ...objective, name, updatedAt: new Date().toISOString() }
              : objective,
          ),
      )

      return { previousObjectives }
    },
    onError: (err, _, context) => {
      if (context?.previousObjectives) {
        queryClient.setQueryData(
          ['objectives', operationNumber],
          context.previousObjectives,
        )
      }
      toast.error(
        err instanceof Error ? err.message : 'Failed to update objective',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['objectives', operationNumber],
      })
    },
  })
}

/**
 * Hook to set objective done status with optimistic updates
 */
export function useSetObjectiveDone(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      objectiveId,
      done,
    }: {
      objectiveId: string
      done: boolean
    }) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/objectives/${objectiveId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ done }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to update objective')
      }
      return response.json()
    },
    onMutate: async ({ objectiveId, done }) => {
      await queryClient.cancelQueries({
        queryKey: ['objectives', operationNumber],
      })

      const previousObjectives = queryClient.getQueryData<Objective[]>([
        'objectives',
        operationNumber,
      ])

      queryClient.setQueryData<Objective[]>(
        ['objectives', operationNumber],
        (old) =>
          old?.map((objective) =>
            objective.id === objectiveId
              ? { ...objective, done, updatedAt: new Date().toISOString() }
              : objective,
          ),
      )

      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          completedObjectives: operation.completedObjectives + (done ? 1 : -1),
          updatedAt: new Date().toISOString(),
        }),
      )

      return { previousObjectives }
    },
    onError: (err, { done }, context) => {
      if (context?.previousObjectives) {
        queryClient.setQueryData(
          ['objectives', operationNumber],
          context.previousObjectives,
        )
      }
      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          completedObjectives: operation.completedObjectives + (done ? -1 : 1),
        }),
      )
      toast.error(
        err instanceof Error ? err.message : 'Failed to update objective',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['objectives', operationNumber],
      })
    },
  })
}

/**
 * Hook to update an objective's note with optimistic updates
 */
export function useUpdateObjectiveNote(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      objectiveId,
      note,
    }: {
      objectiveId: string
      note: string | null
    }) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/objectives/${objectiveId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(
          response,
          'Failed to update objective note',
        )
      }
      return response.json()
    },
    onMutate: async ({ objectiveId, note }) => {
      await queryClient.cancelQueries({
        queryKey: ['objectives', operationNumber],
      })

      const previousObjectives = queryClient.getQueryData<Objective[]>([
        'objectives',
        operationNumber,
      ])

      queryClient.setQueryData<Objective[]>(
        ['objectives', operationNumber],
        (old) =>
          old?.map((objective) =>
            objective.id === objectiveId
              ? { ...objective, note, updatedAt: new Date().toISOString() }
              : objective,
          ),
      )

      return { previousObjectives }
    },
    onError: (err, _, context) => {
      if (context?.previousObjectives) {
        queryClient.setQueryData(
          ['objectives', operationNumber],
          context.previousObjectives,
        )
      }
      toast.error(
        err instanceof Error ? err.message : 'Failed to update objective note',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['objectives', operationNumber],
      })
    },
  })
}

/**
 * Hook to delete an objective with optimistic updates
 */
export function useDeleteObjective(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/objectives/${objectiveId}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to delete objective')
      }
    },
    onMutate: async (objectiveId) => {
      await queryClient.cancelQueries({
        queryKey: ['objectives', operationNumber],
      })

      const previousObjectives = queryClient.getQueryData<Objective[]>([
        'objectives',
        operationNumber,
      ])

      // Remove objective and all its descendants
      const getDescendantIds = (
        id: string,
        objectives: Objective[],
      ): string[] => {
        const children = objectives.filter((t) => t.parentObjectiveId === id)
        return [
          id,
          ...children.flatMap((c) => getDescendantIds(c.id, objectives)),
        ]
      }

      const allObjectives = previousObjectives ?? []
      const idsToRemove = getDescendantIds(objectiveId, allObjectives)
      const removedDoneCount = allObjectives.filter(
        (t) => idsToRemove.includes(t.id) && t.done,
      ).length

      queryClient.setQueryData<Objective[]>(
        ['objectives', operationNumber],
        (old) =>
          old?.filter((objective) => !idsToRemove.includes(objective.id)),
      )

      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          totalObjectives: operation.totalObjectives - idsToRemove.length,
          completedObjectives: operation.completedObjectives - removedDoneCount,
          updatedAt: new Date().toISOString(),
        }),
      )

      return {
        previousObjectives,
        removedCount: idsToRemove.length,
        removedDoneCount,
      }
    },
    onError: (err, _, context) => {
      if (context?.previousObjectives) {
        queryClient.setQueryData(
          ['objectives', operationNumber],
          context.previousObjectives,
        )
      }
      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          totalObjectives:
            operation.totalObjectives + (context?.removedCount ?? 0),
          completedObjectives:
            operation.completedObjectives + (context?.removedDoneCount ?? 0),
        }),
      )
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete objective',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['objectives', operationNumber],
      })
    },
  })
}

/**
 * Hook to move an objective with optimistic updates
 */
export function useMoveObjective(projectSlug: string, operationNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      objectiveId,
      newParentObjectiveId,
      newPosition,
    }: {
      objectiveId: string
      newParentObjectiveId: string | null
      newPosition: number
    }) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/objectives/${objectiveId}/move`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newParentObjectiveId, newPosition }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to move objective')
      }
      return response.json()
    },
    onMutate: async ({ objectiveId, newParentObjectiveId, newPosition }) => {
      await queryClient.cancelQueries({
        queryKey: ['objectives', operationNumber],
      })

      const previousObjectives = queryClient.getQueryData<Objective[]>([
        'objectives',
        operationNumber,
      ])

      queryClient.setQueryData<Objective[]>(
        ['objectives', operationNumber],
        (old) => {
          if (!old) return old

          const objective = old.find((t) => t.id === objectiveId)
          if (!objective) return old

          const oldParentId = objective.parentObjectiveId
          const oldPosition = objective.position

          // Same location - no change needed
          if (
            oldParentId === newParentObjectiveId &&
            oldPosition === newPosition
          ) {
            return old
          }

          const sameParent = oldParentId === newParentObjectiveId

          return old.map((t) => {
            // Update the moved objective
            if (t.id === objectiveId) {
              return {
                ...t,
                parentObjectiveId: newParentObjectiveId,
                position: newPosition,
                updatedAt: new Date().toISOString(),
              }
            }

            if (sameParent) {
              // Same parent - reorder siblings
              if (t.parentObjectiveId !== oldParentId) return t

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
              if (
                t.parentObjectiveId === oldParentId &&
                t.position > oldPosition
              ) {
                return { ...t, position: t.position - 1 }
              }
              // Make room at new location
              if (
                t.parentObjectiveId === newParentObjectiveId &&
                t.position >= newPosition
              ) {
                return { ...t, position: t.position + 1 }
              }
            }

            return t
          })
        },
      )

      return { previousObjectives }
    },
    onError: (err, _, context) => {
      if (context?.previousObjectives) {
        queryClient.setQueryData(
          ['objectives', operationNumber],
          context.previousObjectives,
        )
      }
      toast.error(
        err instanceof Error ? err.message : 'Failed to move objective',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['objectives', operationNumber],
      })
    },
  })
}
