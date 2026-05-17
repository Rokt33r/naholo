import 'server-only'
import { config } from '@/server/config'
import { getPolarServerClient } from '@/server/billing/polar'

export async function createPolarTrialCheckout(input: {
  projectId: string
  billingEmail: string
  createdByOperatorId: string
}): Promise<{ url: string; expiresAt: Date } | null> {
  if (!config.billing || config.polar == null) {
    return null
  }

  const { projectId, billingEmail, createdByOperatorId } = input
  const polar = getPolarServerClient()

  const checkout = await polar.checkouts.create({
    products: [config.polar.productId],
    customerEmail: billingEmail,
    externalCustomerId: projectId,
    allowTrial: true,
    metadata: { projectId, projectOperatorId: createdByOperatorId },
  })

  return { url: checkout.url, expiresAt: checkout.expiresAt }
}
