import 'server-only'
import { db } from '../db'
import { polarSubscriptions } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { Subscription } from '@polar-sh/sdk/models/components/subscription.js'

export type PolarSubscriptionRow = typeof polarSubscriptions.$inferSelect

export async function upsertPolarSubscriptionFromEvent(input: {
  data: Subscription
}): Promise<{ row: PolarSubscriptionRow; applied: boolean }> {
  const { data } = input

  const existing = await db.query.polarSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.polarSubscriptionId, data.id),
  })

  const values = {
    polarSubscriptionId: data.id,
    polarCustomerId: data.customerId,
    billingEmail: data.customer.email ?? '',
    metadata: (data.metadata as Record<string, unknown>) ?? null,
    status: data.status,
    seats: data.seats ?? null,
    currentPeriodStart: data.currentPeriodStart,
    currentPeriodEnd: data.currentPeriodEnd,
    trialStart: data.trialStart,
    trialEnd: data.trialEnd,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd,
    canceledAt: data.canceledAt,
    startedAt: data.startedAt,
    endsAt: data.endsAt,
    endedAt: data.endedAt,
    modifiedAt: data.modifiedAt,
    updatedAt: new Date(),
  }

  if (existing == null) {
    const [inserted] = await db
      .insert(polarSubscriptions)
      .values(values)
      .returning()
    if (inserted == null) {
      throw new Error(
        'upsertPolarSubscriptionFromEvent: insert returned no row',
      )
    }
    return { row: inserted, applied: true }
  }

  if (
    existing.modifiedAt != null &&
    data.modifiedAt != null &&
    existing.modifiedAt > data.modifiedAt
  ) {
    return { row: existing, applied: false }
  }

  const [updated] = await db
    .update(polarSubscriptions)
    .set(values)
    .where(eq(polarSubscriptions.id, existing.id))
    .returning()
  if (updated == null) {
    throw new Error('upsertPolarSubscriptionFromEvent: update returned no row')
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
