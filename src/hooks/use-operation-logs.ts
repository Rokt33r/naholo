import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'
import { generateOperationLogPreview } from '@/lib/operation-utils'
import { updateOperationListCache } from './use-operations'

export type OperationLog = {
  id: string
  content: string
  projectOperator: { id: string; name: string; type: string } | null
  createdAt: string
  updatedAt: string
}

/**
 * Hook to fetch operation logs for an operation
 */
export function useOperationLogs(projectSlug: string, operationNumber: number) {
  return useQuery({
    queryKey: ['operationLogs', operationNumber],
    queryFn: () =>
      fetcher<OperationLog[]>(
        `/api/projects/${projectSlug}/operations/${operationNumber}/operation-logs`,
      ),
    staleTime: 1000 * 60,
  })
}

/**
 * Hook to create an operation log with optimistic updates
 */
export function useCreateOperationLog(
  projectSlug: string,
  operationNumber: number,
  currentOperator: { id: string; name: string; type: string },
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/operation-logs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(
          response,
          'Failed to create operation log',
        )
      }
      return response.json() as Promise<OperationLog>
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({
        queryKey: ['operationLogs', operationNumber],
      })

      const previousLogs = queryClient.getQueryData<OperationLog[]>([
        'operationLogs',
        operationNumber,
      ])

      const optimisticLog: OperationLog = {
        id: `temp-${Date.now()}`,
        content,
        projectOperator: {
          id: currentOperator.id,
          name: currentOperator.name,
          type: currentOperator.type,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      queryClient.setQueryData<OperationLog[]>(
        ['operationLogs', operationNumber],
        (old) => [...(old ?? []), optimisticLog],
      )

      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          lastOperationLogPreview: generateOperationLogPreview(content),
          updatedAt: new Date().toISOString(),
        }),
      )

      return { previousLogs }
    },
    onError: (err, _, context) => {
      if (context?.previousLogs) {
        queryClient.setQueryData(
          ['operationLogs', operationNumber],
          context.previousLogs,
        )
      }
      const logs = context?.previousLogs ?? []
      const lastLog = logs.length > 0 ? logs[logs.length - 1] : null
      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          lastOperationLogPreview:
            lastLog != null
              ? generateOperationLogPreview(lastLog.content)
              : null,
        }),
      )
      toast.error(
        err instanceof Error ? err.message : 'Failed to create operation log',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['operationLogs', operationNumber],
      })
    },
  })
}

/**
 * Hook to update an operation log with optimistic updates
 */
export function useUpdateOperationLog(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      logId,
      content,
    }: {
      logId: string
      content: string
    }) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/operation-logs/${logId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(
          response,
          'Failed to update operation log',
        )
      }
      return response.json() as Promise<OperationLog>
    },
    onMutate: async ({ logId, content }) => {
      await queryClient.cancelQueries({
        queryKey: ['operationLogs', operationNumber],
      })

      const previousLogs = queryClient.getQueryData<OperationLog[]>([
        'operationLogs',
        operationNumber,
      ])

      queryClient.setQueryData<OperationLog[]>(
        ['operationLogs', operationNumber],
        (old) =>
          old?.map((log) =>
            log.id === logId
              ? { ...log, content, updatedAt: new Date().toISOString() }
              : log,
          ),
      )

      const logs = previousLogs ?? []
      const isLastLog = logs.length > 0 && logs[logs.length - 1].id === logId
      if (isLastLog) {
        updateOperationListCache(
          queryClient,
          projectSlug,
          operationNumber,
          (operation) => ({
            ...operation,
            lastOperationLogPreview: generateOperationLogPreview(content),
            updatedAt: new Date().toISOString(),
          }),
        )
      }

      return { previousLogs }
    },
    onError: (err, _, context) => {
      if (context?.previousLogs) {
        queryClient.setQueryData(
          ['operationLogs', operationNumber],
          context.previousLogs,
        )
      }
      const logs = context?.previousLogs ?? []
      const lastLog = logs.length > 0 ? logs[logs.length - 1] : null
      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          lastOperationLogPreview:
            lastLog != null
              ? generateOperationLogPreview(lastLog.content)
              : null,
        }),
      )
      toast.error(
        err instanceof Error ? err.message : 'Failed to update operation log',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['operationLogs', operationNumber],
      })
    },
  })
}

/**
 * Hook to delete an operation log with optimistic updates
 */
export function useDeleteOperationLog(
  projectSlug: string,
  operationNumber: number,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (logId: string) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/operations/${operationNumber}/operation-logs/${logId}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(
          response,
          'Failed to delete operation log',
        )
      }
    },
    onMutate: async (logId) => {
      await queryClient.cancelQueries({
        queryKey: ['operationLogs', operationNumber],
      })

      const previousLogs = queryClient.getQueryData<OperationLog[]>([
        'operationLogs',
        operationNumber,
      ])

      queryClient.setQueryData<OperationLog[]>(
        ['operationLogs', operationNumber],
        (old) => old?.filter((log) => log.id !== logId),
      )

      const remainingLogs = (previousLogs ?? []).filter(
        (log) => log.id !== logId,
      )
      const newLastLog =
        remainingLogs.length > 0
          ? remainingLogs[remainingLogs.length - 1]
          : null
      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          lastOperationLogPreview:
            newLastLog != null
              ? generateOperationLogPreview(newLastLog.content)
              : null,
          updatedAt: new Date().toISOString(),
        }),
      )

      return { previousLogs }
    },
    onError: (err, _, context) => {
      if (context?.previousLogs) {
        queryClient.setQueryData(
          ['operationLogs', operationNumber],
          context.previousLogs,
        )
      }
      const logs = context?.previousLogs ?? []
      const lastLog = logs.length > 0 ? logs[logs.length - 1] : null
      updateOperationListCache(
        queryClient,
        projectSlug,
        operationNumber,
        (operation) => ({
          ...operation,
          lastOperationLogPreview:
            lastLog != null
              ? generateOperationLogPreview(lastLog.content)
              : null,
        }),
      )
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete operation log',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['operationLogs', operationNumber],
      })
    },
  })
}
