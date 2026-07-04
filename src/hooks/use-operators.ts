import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createResponseError, fetcher, mutationFetch } from '@/lib/fetcher'

export type Operator = {
  id: string
  projectId: string
  userId: string | null
  name: string
  callsign: string
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

export type UpdateOperatorInput = {
  operatorId: string
  name?: string
  callsign?: string
}

/**
 * Hook to update a project operator's name and/or callsign.
 * Refetches the list on success. Errors carry the server message
 * (e.g. callsign conflicts) so callers can render them inline.
 */
export function useUpdateProjectOperator(projectSlug: string) {
  const queryClient = useQueryClient()

  return useMutation<Operator, Error, UpdateOperatorInput>({
    mutationFn: async ({ operatorId, name, callsign }) => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/operators/${operatorId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, callsign }),
        },
      )
      if (!res.ok) {
        throw await createOperatorUpdateError(res)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators', projectSlug] })
    },
  })
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

async function createOperatorUpdateError(response: Response): Promise<Error> {
  try {
    const data = await response.json()
    return new Error(data.message || data.error || 'Failed to update operator')
  } catch (parseError) {
    console.error('Failed to parse error response:', {
      status: response.status,
      parseError,
    })
    return new Error('Failed to update operator')
  }
}
