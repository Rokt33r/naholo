import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetcher } from '@/lib/fetcher'
import type { ActiveProjectSubscriptionResponse } from '@/app/api/projects/[projectSlug]/active-project-subscription/route'

export type { ActiveProjectSubscriptionResponse }

const POLL_INTERVAL_MS = 2000
const POLL_HARD_CAP_MS = 5 * 60 * 1000

export function useActiveProjectSubscription(
  projectSlug: string,
  options?: { awaitingWebhook?: boolean },
) {
  const awaitingWebhook = options?.awaitingWebhook ?? false
  const startedAtRef = useRef<number>(Date.now())

  return useQuery<ActiveProjectSubscriptionResponse>({
    queryKey: ['active-project-subscription', projectSlug],
    queryFn: () =>
      fetcher<ActiveProjectSubscriptionResponse>(
        `/api/projects/${projectSlug}/active-project-subscription`,
      ),
    staleTime: 60 * 1000,
    refetchInterval: () => {
      if (!awaitingWebhook) {
        return false
      }
      if (Date.now() - startedAtRef.current > POLL_HARD_CAP_MS) {
        return false
      }
      return POLL_INTERVAL_MS
    },
  })
}
