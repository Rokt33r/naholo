import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type { Log } from 'naholo-api/types'

import type { Log } from 'naholo-api/types'

/**
 * Hook to fetch logs for an issue
 */
export function useLogs(projectId: string, issueId: string) {
  return useQuery({
    queryKey: ['logs', issueId],
    queryFn: () =>
      fetcher<Log[]>(`/api/projects/${projectId}/issues/${issueId}/logs`),
    staleTime: 1000 * 60,
  })
}

/**
 * Hook to create a log with optimistic updates
 */
export function useCreateLog(
  projectId: string,
  issueId: string,
  currentWorker: { id: string; name: string; type: string },
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueId}/logs`,
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
      await queryClient.cancelQueries({ queryKey: ['logs', issueId] })

      const previousLogs = queryClient.getQueryData<Log[]>(['logs', issueId])

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

      queryClient.setQueryData<Log[]>(['logs', issueId], (old) => [
        ...(old ?? []),
        optimisticLog,
      ])

      return { previousLogs }
    },
    onError: (err, _, context) => {
      if (context?.previousLogs) {
        queryClient.setQueryData(['logs', issueId], context.previousLogs)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to create log')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['logs', issueId] })
    },
  })
}

/**
 * Hook to update a log with optimistic updates
 */
export function useUpdateLog(projectId: string, issueId: string) {
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
        `/api/projects/${projectId}/issues/${issueId}/logs/${logId}`,
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
      await queryClient.cancelQueries({ queryKey: ['logs', issueId] })

      const previousLogs = queryClient.getQueryData<Log[]>(['logs', issueId])

      queryClient.setQueryData<Log[]>(['logs', issueId], (old) =>
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
        queryClient.setQueryData(['logs', issueId], context.previousLogs)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update log')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['logs', issueId] })
    },
  })
}

/**
 * Hook to delete a log with optimistic updates
 */
export function useDeleteLog(projectId: string, issueId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (logId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueId}/logs/${logId}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to delete log')
      }
    },
    onMutate: async (logId) => {
      await queryClient.cancelQueries({ queryKey: ['logs', issueId] })

      const previousLogs = queryClient.getQueryData<Log[]>(['logs', issueId])

      queryClient.setQueryData<Log[]>(['logs', issueId], (old) =>
        old?.filter((log) => log.id !== logId),
      )

      return { previousLogs }
    },
    onError: (err, _, context) => {
      if (context?.previousLogs) {
        queryClient.setQueryData(['logs', issueId], context.previousLogs)
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete log')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['logs', issueId] })
    },
  })
}
