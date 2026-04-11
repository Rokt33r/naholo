import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type { Log } from 'naholo-api/types'

import type { Log } from 'naholo-api/types'

/**
 * Hook to fetch logs for an issue
 */
export function useLogs(projectId: string, issueNumber: number) {
  return useQuery({
    queryKey: ['logs', issueNumber],
    queryFn: () =>
      fetcher<Log[]>(`/api/projects/${projectId}/issues/${issueNumber}/logs`),
    staleTime: 1000 * 60,
  })
}

/**
 * Hook to create a log with optimistic updates
 */
export function useCreateLog(
  projectId: string,
  issueNumber: number,
  currentWorker: { id: string; name: string; type: string },
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueNumber}/logs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to create log')
      }
      return response.json() as Promise<Log>
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ['logs', issueNumber] })

      const previousLogs = queryClient.getQueryData<Log[]>([
        'logs',
        issueNumber,
      ])

      const optimisticLog: Log = {
        id: `temp-${Date.now()}`,
        content,
        projectWorker: {
          id: currentWorker.id,
          name: currentWorker.name,
          type: currentWorker.type,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      queryClient.setQueryData<Log[]>(['logs', issueNumber], (old) => [
        ...(old ?? []),
        optimisticLog,
      ])

      return { previousLogs }
    },
    onError: (err, _, context) => {
      if (context?.previousLogs) {
        queryClient.setQueryData(['logs', issueNumber], context.previousLogs)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to create log')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['logs', issueNumber] })
    },
  })
}

/**
 * Hook to update a log with optimistic updates
 */
export function useUpdateLog(projectId: string, issueNumber: number) {
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
        `/api/projects/${projectId}/issues/${issueNumber}/logs/${logId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to update log')
      }
      return response.json() as Promise<Log>
    },
    onMutate: async ({ logId, content }) => {
      await queryClient.cancelQueries({ queryKey: ['logs', issueNumber] })

      const previousLogs = queryClient.getQueryData<Log[]>([
        'logs',
        issueNumber,
      ])

      queryClient.setQueryData<Log[]>(['logs', issueNumber], (old) =>
        old?.map((log) =>
          log.id === logId
            ? { ...log, content, updatedAt: new Date().toISOString() }
            : log,
        ),
      )

      return { previousLogs }
    },
    onError: (err, _, context) => {
      if (context?.previousLogs) {
        queryClient.setQueryData(['logs', issueNumber], context.previousLogs)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update log')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['logs', issueNumber] })
    },
  })
}

/**
 * Hook to delete a log with optimistic updates
 */
export function useDeleteLog(projectId: string, issueNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (logId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueNumber}/logs/${logId}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to delete log')
      }
    },
    onMutate: async (logId) => {
      await queryClient.cancelQueries({ queryKey: ['logs', issueNumber] })

      const previousLogs = queryClient.getQueryData<Log[]>([
        'logs',
        issueNumber,
      ])

      queryClient.setQueryData<Log[]>(['logs', issueNumber], (old) =>
        old?.filter((log) => log.id !== logId),
      )

      return { previousLogs }
    },
    onError: (err, _, context) => {
      if (context?.previousLogs) {
        queryClient.setQueryData(['logs', issueNumber], context.previousLogs)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete log')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['logs', issueNumber] })
    },
  })
}
