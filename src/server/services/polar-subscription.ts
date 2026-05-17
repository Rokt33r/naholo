import 'server-only'
import { db } from '../db'
import { polarSubscriptions } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { Subscription } from '@polar-sh/sdk/models/components/subscription.js'

export type PolarSubscriptionRow = typeof polarSubscriptions.$inferSelect

export async function upsertPolarSubscription(
  polarSubscription: Subscription,
): Promise<{ row: PolarSubscriptionRow; applied: boolean }> {
  const existing = await db.query.polarSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.polarSubscriptionId, polarSubscription.id),
  })

  const values = {
    polarSubscriptionId: polarSubscription.id,
    polarCustomerId: polarSubscription.customerId,
    billingEmail: polarSubscription.customer.email ?? '',
    metadata: (polarSubscription.metadata as Record<string, unknown>) ?? null,
    status: polarSubscription.status,
    seats: polarSubscription.seats ?? null,
    currentPeriodStart: polarSubscription.currentPeriodStart,
    currentPeriodEnd: polarSubscription.currentPeriodEnd,
    trialStart: polarSubscription.trialStart,
    trialEnd: polarSubscription.trialEnd,
    cancelAtPeriodEnd: polarSubscription.cancelAtPeriodEnd,
    canceledAt: polarSubscription.canceledAt,
    startedAt: polarSubscription.startedAt,
    endsAt: polarSubscription.endsAt,
    endedAt: polarSubscription.endedAt,
    modifiedAt: polarSubscription.modifiedAt,
    updatedAt: new Date(),
  }

  if (existing == null) {
    const [inserted] = await db
      .insert(polarSubscriptions)
      .values(values)
      .returning()
    if (inserted == null) {
      throw new Error('upsertPolarSubscription: insert returned no row')
    }
    return { row: inserted, applied: true }
  }

  if (
    existing.modifiedAt != null &&
    polarSubscription.modifiedAt != null &&
    existing.modifiedAt > polarSubscription.modifiedAt
  ) {
    return { row: existing, applied: false }
  }

  const [updated] = await db
    .update(polarSubscriptions)
    .set(values)
    .where(eq(polarSubscriptions.id, existing.id))
    .returning()
  if (updated == null) {
    throw new Error('upsertPolarSubscription: update returned no row')
  }
  return { row: updated, applied: true }
}

export async function patchPolarSubscriptionBillingEmail(input: {
  polarCustomerId: string
  billingEmail: string
}): Promise<void> {
  await db
    .update(polarSubscriptions)
    .set({ billingEmail: input.billingEmail, updatedAt: new Date() })
    .where(eq(polarSubscriptions.polarCustomerId, input.polarCustomerId))
}
