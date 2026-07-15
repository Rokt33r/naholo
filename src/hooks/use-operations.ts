import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, mutationFetch, createResponseError } from '@/lib/fetcher'

export type OperationLabel = {
  id: string
  name: string
  color: string
}

export type OperationAssignee = {
  id: string
  projectOperatorId: string
  name: string
  callsign: string
}

export type OperationListItem = {
  id: string
  number: number
  title: string
  closed: boolean
  closedAt: string | null
  createdAt: string
  updatedAt: string
  lastOperationLogPreview: string | null
  totalTasks: number
  completedTasks: number
  labels: OperationLabel[]
  assignees: OperationAssignee[]
}

export type OperationDetail = {
  id: string
  projectId: string
  number: number
  title: string
  closed: boolean
  closedAt: string | null
  createdAt: string
  updatedAt: string
  labels: OperationLabel[]
  assignees: OperationAssignee[]
}

export function updateOperationListCache(
  queryClient: QueryClient,
  projectSlug: string,
  operationNumber: number,
  updater: (operation: OperationListItem) => OperationListItem,
) {
  for (const filter of ['open', 'closed'] as const) {
    queryClient.setQueryData<OperationListItem[]>(
      ['operations', projectSlug, filter],
      (old) =>
        old?.map((operation) =>
          operation.number === operationNumber ? updater(operation) : operation,
        ),
    )
  }
}

/**
 * Hook to fetch operations list for a project
 */
export function useOperations(projectSlug: string, filter: 'open' | 'closed') {
  const query = useQuery({
    queryKey: ['operations', projectSlug, filter],
    queryFn: () =>
      fetcher<OperationListItem[]>(
        `/api/projects/${projectSlug}/operations?closed=${filter === 'closed'}`,
      ),
  })

  return {
    operations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook to fetch a single operation
 */
export function useOperation(projectSlug: string, operationNumber: number) {
  const query = useQuery({
    queryKey: ['operation', projectSlug, operationNumber],
    queryFn: () =>
      fetcher<OperationDetail>(
        `/api/projects/${projectSlug}/operations/${operationNumber}`,
      ),
  })

  return {
    operation: query.data,
    isLoading: query.isLoading,
    error: query.error,
  }
}

/**
 * Hook to create an operation
 */
export function useCreateOperation(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      title,
      assigneeIds,
      labelIds,
    }: {
      title: string
      assigneeIds?: string[]
      labelIds?: string[]
    }) => {
      const response = await mutationFetch(
        `/api/projects/${projectSlug}/operations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, assigneeIds, labelIds }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to create operation')
      }
      return response.json() as Promise<{ id: string; number: number }>
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create operation',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['operations', projectSlug],
      })
    },
  })
}

/**
 * Hook to update an operation's title with optimistic updates
 */
export function useUpdateOperationTitle(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newTitle: string) => {
      const response = await mutationFetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to update title')
      }
      return response.json()
    },
    onMutate: async (newTitle) => {
      await queryClient.cancelQueries({
        queryKey: ['operation', projectSlug, operationNumber],
      })

      const previousOperation = queryClient.getQueryData<OperationDetail>([
        'operation',
        projectSlug,
        operationNumber,
      ])

      queryClient.setQueryData<OperationDetail>(
        ['operation', projectSlug, operationNumber],
        (old) => (old ? { ...old, title: newTitle } : old),
      )

      // Update both operation list caches
      for (const filter of ['open', 'closed'] as const) {
        queryClient.setQueryData<OperationListItem[]>(
          ['operations', projectSlug, filter],
          (old) =>
            old?.map((operation) =>
              operation.number === operationNumber
                ? { ...operation, title: newTitle }
                : operation,
            ),
        )
      }

      return { previousOperation }
    },
    onError: (err, _, context) => {
      if (context?.previousOperation) {
        queryClient.setQueryData(
          ['operation', projectSlug, operationNumber],
          context.previousOperation,
        )
      }
      queryClient.invalidateQueries({
        queryKey: ['operations', projectSlug],
      })
      toast.error(err instanceof Error ? err.message : 'Failed to update title')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['operation', projectSlug, operationNumber],
      })
      queryClient.invalidateQueries({
        queryKey: ['operations', projectSlug],
      })
    },
  })
}

/**
 * Hook to close an operation with optimistic updates
 */
export function useCloseOperation(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await mutationFetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/close`,
        { method: 'POST' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to close operation')
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ['operation', projectSlug, operationNumber],
      })

      const previousOperation = queryClient.getQueryData<OperationDetail>([
        'operation',
        projectSlug,
        operationNumber,
      ])

      const now = new Date()
      queryClient.setQueryData<OperationDetail>(
        ['operation', projectSlug, operationNumber],
        (old) =>
          old ? { ...old, closed: true, closedAt: now.toISOString() } : old,
      )

      return { previousOperation }
    },
    onError: (err, _, context) => {
      if (context?.previousOperation) {
        queryClient.setQueryData(
          ['operation', projectSlug, operationNumber],
          context.previousOperation,
        )
      }
      toast.error(
        err instanceof Error ? err.message : 'Failed to close operation',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['operation', projectSlug, operationNumber],
      })
      queryClient.invalidateQueries({
        queryKey: ['operations', projectSlug],
      })
    },
  })
}

/**
 * Hook to reopen an operation with optimistic updates
 */
export function useReopenOperation(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await mutationFetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/close`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to reopen operation')
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ['operation', projectSlug, operationNumber],
      })

      const previousOperation = queryClient.getQueryData<OperationDetail>([
        'operation',
        projectSlug,
        operationNumber,
      ])

      queryClient.setQueryData<OperationDetail>(
        ['operation', projectSlug, operationNumber],
        (old) => (old ? { ...old, closed: false, closedAt: null } : old),
      )

      return { previousOperation }
    },
    onError: (err, _, context) => {
      if (context?.previousOperation) {
        queryClient.setQueryData(
          ['operation', projectSlug, operationNumber],
          context.previousOperation,
        )
      }
      toast.error(
        err instanceof Error ? err.message : 'Failed to reopen operation',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['operation', projectSlug, operationNumber],
      })
      queryClient.invalidateQueries({
        queryKey: ['operations', projectSlug],
      })
    },
  })
}

/**
 * Hook to delete an operation
 */
export function useDeleteOperation(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await mutationFetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to delete operation')
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete operation',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['operations', projectSlug],
      })
    },
  })
}
