import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createResponseError, fetcher, mutationFetch } from '@/lib/fetcher'

export type Operator = {
  id: string
  projectId: string
  userId: string | null
  name: string
  role: string
  createdAt: string
}

/**
 * Hook to fetch all operators in a project
 */
export function useOperators(projectSlug: string) {
  const query = useQuery({
    queryKey: ['operators', projectSlug],
    queryFn: () =>
      fetcher<Operator[]>(`/api/projects/${projectSlug}/operators`),
  })

  return {
    operators: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

/**
 * Hook to remove a project operator. Refetches the list on success.
 */
export function useRemoveProjectOperator(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (operatorId) => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/operators/${operatorId}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        throw await createResponseError(res, 'Failed to remove operator')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators', projectSlug] })
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to remove operator',
      )
    },
  })
}
