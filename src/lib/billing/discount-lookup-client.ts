import { createResponseError } from '@/lib/fetcher'

export type SubscriptionDiscount = {
  id: string
  code: string
  description: string
  status: 'active' | 'archived' | 'expired' | 'used'
}

export async function lookupSubscriptionDiscount(
  projectSlug: string,
  code: string,
): Promise<SubscriptionDiscount> {
  const res = await fetch(
    `/api/projects/${projectSlug}/billing/discount-lookup`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    },
  )
  if (!res.ok) {
    throw await createResponseError(res)
  }
  const body = (await res.json()) as { discount: SubscriptionDiscount }
  return body.discount
}
