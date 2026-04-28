import { useQuery } from '@tanstack/react-query'
import { fetcher } from '@/lib/fetcher'
import type { ProjectSubscriptionView } from '@/app/api/projects/[projectSlug]/billing/route'

export type { ProjectSubscriptionView }

export function useProjectSubscription(projectSlug: string) {
  return useQuery<ProjectSubscriptionView>({
    queryKey: ['project-subscription', projectSlug],
    queryFn: () =>
      fetcher<ProjectSubscriptionView>(`/api/projects/${projectSlug}/billing`),
    staleTime: 60 * 1000,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status == null || status === 'incomplete') {
        return 3000
      }
      return false
    },
  })
}
