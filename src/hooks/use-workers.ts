import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type { Worker } from 'naholo-api/types'

import type { Worker } from 'naholo-api/types'

/**
 * Hook to fetch all workers in a project
 */
export function useWorkers(projectSlug: string) {
  const query = useQuery({
    queryKey: ['workers', projectSlug],
    queryFn: () => fetcher<Worker[]>(`/api/projects/${projectSlug}/workers`),
  })

  return {
    workers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

/**
 * Hook to fetch a single worker
 */
export function useWorker(projectSlug: string, workerId: string) {
  const query = useQuery({
    queryKey: ['worker', projectSlug, workerId],
    queryFn: () =>
      fetcher<Worker>(`/api/projects/${projectSlug}/workers/${workerId}`),
  })

  return {
    worker: query.data,
    isLoading: query.isLoading,
    error: query.error,
  }
}

/**
 * Hook to create a new bot worker
 */
export function useCreateWorker(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/projects/${projectSlug}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to create worker')
      }
      return response.json() as Promise<{ id: string }>
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create worker',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['workers', projectSlug],
      })
    },
  })
}
