export async function fetchProjectSubscriptionCheckoutToken(
  projectSlug: string,
): Promise<{ token: string; expiresAt: Date }> {
  const res = await fetch(
    `/api/projects/${projectSlug}/billing/checkout-token`,
    { method: 'POST' },
  )
  if (!res.ok) {
    throw new Error(`Failed to issue checkout token: ${res.status}`)
  }
  const body = (await res.json()) as { token: string; expiresAt: string }
  return { token: body.token, expiresAt: new Date(body.expiresAt) }
}
