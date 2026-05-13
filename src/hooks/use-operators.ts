import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type Operator = {
  id: string
  projectId: string
  userId: string | null
  type: string
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
 * Hook to fetch a single operator
 */
export function useOperator(projectSlug: string, operatorId: string) {
  const query = useQuery({
    queryKey: ['operator', projectSlug, operatorId],
    queryFn: () =>
      fetcher<Operator>(`/api/projects/${projectSlug}/operators/${operatorId}`),
  })

  return {
    operator: query.data,
    isLoading: query.isLoading,
    error: query.error,
  }
}

/**
 * Hook to create a new bot operator
 */
export function useCreateOperator(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/projects/${projectSlug}/operators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to create operator')
      }
      return response.json() as Promise<{ id: string }>
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create operator',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['operators', projectSlug],
      })
    },
  })
}
