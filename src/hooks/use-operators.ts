import { useQuery } from '@tanstack/react-query'
import { fetcher } from '@/lib/fetcher'

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
