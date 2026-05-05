import 'server-only'
import { db } from '../db'
import {
  paddleSubscriptions,
  type PaddleSubscriptionStatus,
} from '../db/schema'
import { eq } from 'drizzle-orm'
import type {
  Subscription,
  SubscriptionNotification,
} from '@paddle/paddle-node-sdk'

export type PaddleSubscriptionRow = typeof paddleSubscriptions.$inferSelect

const KNOWN_STATUSES: ReadonlyArray<PaddleSubscriptionStatus> = [
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'paused',
  'canceled',
]

export async function upsertPaddleSubscriptionFromEvent(input: {
  data: Subscription | SubscriptionNotification
  occurredAt: Date
}): Promise<{ row: PaddleSubscriptionRow; applied: boolean }> {
  const { data, occurredAt } = input

  const existing = await db.query.paddleSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.paddleSubscriptionId, data.id),
  })

  const trialEndsAt = parseDate(data.items[0]?.trialDates?.endsAt)
  const scheduledCancelAt =
    data.scheduledChange?.action === 'cancel'
      ? parseDate(data.scheduledChange.effectiveAt)
      : null

  const values = {
    paddleSubscriptionId: data.id,
    paddleCustomerId: data.customerId,
    customData: data.customData ?? null,
    status: mapStatus(data.status),
    seatQuantity: sumSeats(data.items),
    currentPeriodStart: parseDate(data.currentBillingPeriod?.startsAt),
    currentPeriodEnd: parseDate(data.currentBillingPeriod?.endsAt),
    trialEndsAt,
    cancelAt: scheduledCancelAt,
    canceledAt: parseDate(data.canceledAt),
    lastEventOccurredAt: occurredAt,
    updatedAt: new Date(),
  }

  if (existing == null) {
    const [inserted] = await db
      .insert(paddleSubscriptions)
      .values(values)
      .returning()
    if (inserted == null) {
      throw new Error(
        'upsertPaddleSubscriptionFromEvent: insert returned no row',
      )
    }
    return { row: inserted, applied: true }
  }

  if (
    existing.lastEventOccurredAt != null &&
    existing.lastEventOccurredAt >= occurredAt
  ) {
    return { row: existing, applied: false }
  }

  const [updated] = await db
    .update(paddleSubscriptions)
    .set(values)
    .where(eq(paddleSubscriptions.id, existing.id))
    .returning()
  if (updated == null) {
    throw new Error('upsertPaddleSubscriptionFromEvent: update returned no row')
  }
  return { row: updated, applied: true }
}

export async function patchPaddleSubscriptionBillingEmail(input: {
  paddleCustomerId: string
  billingEmail: string
}): Promise<void> {
  await db
    .update(paddleSubscriptions)
    .set({ billingEmail: input.billingEmail, updatedAt: new Date() })
    .where(eq(paddleSubscriptions.paddleCustomerId, input.paddleCustomerId))
}

function mapStatus(status: string): PaddleSubscriptionStatus {
  return KNOWN_STATUSES.includes(status as PaddleSubscriptionStatus)
    ? (status as PaddleSubscriptionStatus)
    : 'incomplete'
}

function parseDate(value: string | null | undefined): Date | null {
  if (value == null) {
    return null
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    return null
  }
  return d
}

function sumSeats(
  items: ReadonlyArray<{ quantity: number }> | null | undefined,
): number {
  if (items == null || items.length === 0) {
    return 1
  }
  return items.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
}
