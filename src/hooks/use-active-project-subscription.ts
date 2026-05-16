import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResponseError, fetcher, mutationFetch } from '@/lib/fetcher'
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

export type SubscriptionCancellationAction = 'cancel' | 'resume'

export function useUpdateSubscriptionCancellation(projectSlug: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, SubscriptionCancellationAction>({
    mutationFn: async (action) => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/billing/cancellation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
      )
      if (!res.ok) {
        throw await createResponseError(res)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['active-project-subscription', projectSlug],
      })
    },
  })
}
