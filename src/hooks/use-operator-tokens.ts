import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetcher, createResponseError } from '@/lib/fetcher'

export type OperatorToken = {
  id: string
  name: string
  tokenHint: string
  lastUsedAt: string | null
  createdAt: string
}

export type CreateOperatorTokenResult = {
  id: string
  token: string
}

/**
 * Hook to fetch API tokens for an operator
 */
export function useOperatorTokens(projectSlug: string, operatorId: string) {
  const query = useQuery({
    queryKey: ['operatorTokens', projectSlug, operatorId],
    queryFn: () =>
      fetcher<OperatorToken[]>(
        `/api/projects/${projectSlug}/operators/${operatorId}/tokens`,
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
export function useCreateOperatorToken(
  projectSlug: string,
  operatorId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/operators/${operatorId}/tokens`,
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
        queryKey: ['operatorTokens', projectSlug, operatorId],
      })
    },
  })
}

/**
 * Hook to revoke an API token
 */
export function useRevokeOperatorToken(
  projectSlug: string,
  operatorId: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tokenId: string) => {
      const response = await fetch(
        `/api/projects/${projectSlug}/operators/${operatorId}/tokens/${tokenId}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to revoke token')
      }
    },
    onMutate: async (tokenId) => {
      await queryClient.cancelQueries({
        queryKey: ['operatorTokens', projectSlug, operatorId],
      })

      const previous = queryClient.getQueryData<OperatorToken[]>([
        'operatorTokens',
        projectSlug,
        operatorId,
      ])

      queryClient.setQueryData<OperatorToken[]>(
        ['operatorTokens', projectSlug, operatorId],
        (old) => old?.filter((t) => t.id !== tokenId),
      )

      return { previous }
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['operatorTokens', projectSlug, operatorId],
          context.previous,
        )
      }
      toast.error(err instanceof Error ? err.message : 'Failed to revoke token')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['operatorTokens', projectSlug, operatorId],
      })
    },
  })
}
