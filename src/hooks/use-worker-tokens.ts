import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type { WorkerToken, CreateWorkerTokenResult } from 'naholo-api/types'

import type { WorkerToken } from 'naholo-api/types'

/**
 * Hook to fetch API tokens for a worker
 */
export function useWorkerTokens(projectId: string, workerId: string) {
  const query = useQuery({
    queryKey: ['workerTokens', projectId, workerId],
    queryFn: () =>
      fetcher<WorkerToken[]>(
        `/api/projects/${projectId}/workers/${workerId}/tokens`,
      ),
  })

  return {
    tokens: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

/**
 * Hook to create a new API token
 */
export function useCreateWorkerToken(projectId: string, workerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/workers/${workerId}/tokens`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to create token')
      }
      return response.json() as Promise<{ id: string; token: string }>
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create token')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['workerTokens', projectId, workerId],
      })
    },
  })
}

/**
 * Hook to revoke an API token
 */
export function useRevokeWorkerToken(projectId: string, workerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tokenId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/workers/${workerId}/tokens/${tokenId}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to revoke token')
      }
    },
    onMutate: async (tokenId) => {
      await queryClient.cancelQueries({
        queryKey: ['workerTokens', projectId, workerId],
      })

      const previous = queryClient.getQueryData<WorkerToken[]>([
        'workerTokens',
        projectId,
        workerId,
      ])

      queryClient.setQueryData<WorkerToken[]>(
        ['workerTokens', projectId, workerId],
        (old) => old?.filter((t) => t.id !== tokenId),
      )

      return { previous }
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['workerTokens', projectId, workerId],
          context.previous,
        )
      }
      toast.error(err instanceof Error ? err.message : 'Failed to revoke token')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['workerTokens', projectId, workerId],
      })
    },
  })
}
