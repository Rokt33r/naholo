import { useQuery } from '@tanstack/react-query'
import { fetcher } from '@/lib/fetcher'

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
