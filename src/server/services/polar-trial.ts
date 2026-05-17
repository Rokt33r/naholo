import 'server-only'
import { eq } from 'drizzle-orm'
import { ResourceNotFound } from '@polar-sh/sdk/models/errors/resourcenotfound.js'
import { db } from '../db'
import { projects, projectSubscriptions } from '../db/schema'
import { config } from '@/server/config'
import { getPolarServerClient } from '@/server/billing/polar'
import { upsertPolarSubscription } from './polar-subscription'

export async function provisionPolarTrialForProject(input: {
  projectId: string
  billingEmail: string
  createdByOperatorId: string
}): Promise<{ projectSubscriptionId: string } | null> {
  if (!config.billing || config.polar == null) {
    return null
  }

  const { projectId, billingEmail, createdByOperatorId } = input
  const polar = getPolarServerClient()

  let customerId: string
  try {
    const existing = await polar.customers.getExternal({
      externalId: projectId,
    })
    customerId = existing.id
  } catch (error) {
    if (!(error instanceof ResourceNotFound)) {
      throw error
    }
    const created = await polar.customers.create({
      email: billingEmail,
      externalId: projectId,
      metadata: { projectId },
    })
    customerId = created.id
  }

  const subscription = await polar.subscriptions.create({
    productId: config.polar.productId,
    customerId,
    metadata: { projectId, projectOperatorId: createdByOperatorId },
  })

  const { row } = await upsertPolarSubscription(subscription)

  const [link] = await db
    .insert(projectSubscriptions)
    .values({
      projectId,
      polarSubscriptionId: row.id,
      createdByOperatorId,
    })
    .returning({ id: projectSubscriptions.id })

  await db
    .update(projects)
    .set({ activeProjectSubscriptionId: link.id, updatedAt: new Date() })
    .where(eq(projects.id, projectId))

  return { projectSubscriptionId: link.id }
}
