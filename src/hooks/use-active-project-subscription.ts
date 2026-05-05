import { useQuery } from '@tanstack/react-query'
import { fetcher } from '@/lib/fetcher'
import type { ActiveProjectSubscriptionResponse } from '@/app/api/projects/[projectSlug]/active-project-subscription/route'

export type { ActiveProjectSubscriptionResponse }

const POLL_INTERVAL_MS = 2000
const POLL_HARD_CAP_MS = 5 * 60 * 1000

export function useActiveProjectSubscription(projectSlug: string) {
  const startedAt = Date.now()
  return useQuery<ActiveProjectSubscriptionResponse>({
    queryKey: ['active-project-subscription', projectSlug],
    queryFn: () =>
      fetcher<ActiveProjectSubscriptionResponse>(
        `/api/projects/${projectSlug}/active-project-subscription`,
      ),
    staleTime: 60 * 1000,
    refetchInterval: (query) => {
      if (Date.now() - startedAt > POLL_HARD_CAP_MS) {
        return false
      }
      const subscription = query.state.data?.subscription
      if (subscription == null) {
        return POLL_INTERVAL_MS
      }
      const status = subscription.paddleSubscription.status
      if (status === 'incomplete') {
        return POLL_INTERVAL_MS
      }
      return false
    },
  })
}
