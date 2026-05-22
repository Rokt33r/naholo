import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResponseError, fetcher, mutationFetch } from '@/lib/fetcher'
import type { ActiveProjectSubscriptionResponse } from '@/app/api/projects/[projectSlug]/active-project-subscription/route'

export type { ActiveProjectSubscriptionResponse }

export function useActiveProjectSubscription(projectSlug: string) {
  return useQuery<ActiveProjectSubscriptionResponse>({
    queryKey: ['active-project-subscription', projectSlug],
    queryFn: () =>
      fetcher<ActiveProjectSubscriptionResponse>(
        `/api/projects/${projectSlug}/active-project-subscription`,
      ),
    staleTime: 60 * 1000,
  })
}

export function useInvalidateActiveProjectSubscription(projectSlug: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({
      queryKey: ['active-project-subscription', projectSlug],
    })
  }
}

export function useUpdateSubscriptionSeats(projectSlug: string) {
  const invalidate = useInvalidateActiveProjectSubscription(projectSlug)
  return useMutation<{ ok: true; seats: number }, Error, number>({
    mutationFn: async (seats) => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/billing/seats`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seats }),
        },
      )
      if (!res.ok) {
        throw await createResponseError(res)
      }
      return (await res.json()) as { ok: true; seats: number }
    },
    onSuccess: invalidate,
  })
}

export type ClaimProjectTrialResponse = {
  ok: true
  expiresAt: string
}

export function useClaimProjectTrial(projectSlug: string) {
  const invalidate = useInvalidateActiveProjectSubscription(projectSlug)
  return useMutation<ClaimProjectTrialResponse, Error, void>({
    mutationFn: async () => {
      const res = await mutationFetch(
        `/api/projects/${projectSlug}/billing/trial`,
        { method: 'POST' },
      )
      if (!res.ok) {
        throw await createResponseError(res)
      }
      return (await res.json()) as ClaimProjectTrialResponse
    },
    onSuccess: invalidate,
  })
}

export type SubscriptionCancellationAction = 'cancel' | 'resume'

export function useUpdateSubscriptionCancellation(projectSlug: string) {
  const invalidate = useInvalidateActiveProjectSubscription(projectSlug)
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
    onSuccess: invalidate,
  })
}
