import { useQuery } from '@tanstack/react-query'
import { fetcher } from '@/lib/fetcher'

export type { Worker } from 'naholo-api/types'

import type { Worker } from 'naholo-api/types'

/**
 * Hook to fetch all workers in a project
 */
export function useWorkers(projectId: string) {
  const query = useQuery({
    queryKey: ['workers', projectId],
    queryFn: () => fetcher<Worker[]>(`/api/projects/${projectId}/workers`),
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
export function useWorker(projectId: string, workerId: string) {
  const query = useQuery({
    queryKey: ['worker', projectId, workerId],
    queryFn: () =>
      fetcher<Worker>(`/api/projects/${projectId}/workers/${workerId}`),
  })

  return {
    worker: query.data,
    isLoading: query.isLoading,
    error: query.error,
  }
}
