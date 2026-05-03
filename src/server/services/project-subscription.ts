import 'server-only'
import { db } from '../db'
import { projectSubscriptions, projectOperators } from '../db/schema'
import { and, count, eq } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { SeatLimitExceededError, SubscriptionNotReadyError } from '../errors'
import type { Subscription } from '@paddle/paddle-node-sdk'

export type SubscriptionStatus =
  | 'incomplete'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'canceled'

export type ProjectSubscription = {
  id: string
  projectId: string
  billingUserId: string
  paddleCustomerId: string | null
  paddleSubscriptionId: string | null
  status: SubscriptionStatus
  seatQuantity: number
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  trialEndsAt: Date | null
  cancelAt: Date | null
  canceledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

function mapRow(
  row: typeof projectSubscriptions.$inferSelect,
): ProjectSubscription {
  return {
    id: row.id,
    projectId: row.projectId,
    billingUserId: row.billingUserId,
    paddleCustomerId: row.paddleCustomerId,
    paddleSubscriptionId: row.paddleSubscriptionId,
    status: row.status as SubscriptionStatus,
    seatQuantity: row.seatQuantity,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    trialEndsAt: row.trialEndsAt,
    cancelAt: row.cancelAt,
    canceledAt: row.canceledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function isActiveSubscriptionStatus(
  status: SubscriptionStatus,
): boolean {
  return status === 'active' || status === 'trialing'
}

export async function resolveProjectSubscription(input: {
  projectId: string
  billingUserId: string
}): Promise<ProjectSubscription> {
  const existing = await db.query.projectSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.projectId, input.projectId),
  })
  if (existing != null) {
    return mapRow(existing)
  }

  const [inserted] = await db
    .insert(projectSubscriptions)
    .values({
      projectId: input.projectId,
      billingUserId: input.billingUserId,
      status: 'incomplete',
      seatQuantity: 1,
    })
    .onConflictDoNothing({ target: projectSubscriptions.projectId })
    .returning()
  if (inserted != null) {
    return mapRow(inserted)
  }

  const winner = await db.query.projectSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.projectId, input.projectId),
  })
  if (winner == null) {
    throw new Error('resolveProjectSubscription: row vanished after conflict')
  }
  return mapRow(winner)
}

function mapPaddleStatus(
  status: string | undefined,
): SubscriptionStatus | null {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'paused':
    case 'canceled':
      return status
    default:
      return null
  }
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

type PaddleSubscriptionEventData = {
  id: string
  customerId?: string | null
  status?: string
  items?: Array<{ quantity?: number }> | null
  currentBillingPeriod?: {
    startsAt?: string | null
    endsAt?: string | null
  } | null
  nextBilledAt?: string | null
  canceledAt?: string | null
  scheduledChange?: { effectiveAt?: string | null; action?: string } | null
  customData?: { projectId?: string; subscriptionId?: string } | null
  trialDates?: { endsAt?: string | null } | null
}

type PaddleTransactionEventData = {
  id: string
  subscriptionId?: string | null
  customerId?: string | null
  status?: string
  customData?: { projectId?: string; subscriptionId?: string } | null
}

export type PaddleWebhookEvent =
  | {
      eventType:
        | 'subscription.activated'
        | 'subscription.canceled'
        | 'subscription.created'
        | 'subscription.imported'
        | 'subscription.past_due'
        | 'subscription.paused'
        | 'subscription.resumed'
        | 'subscription.trialing'
        | 'subscription.updated'
      data: PaddleSubscriptionEventData
    }
  | {
      eventType: 'transaction.completed'
      data: PaddleTransactionEventData
    }

function buildSubscriptionUpdates(
  data: PaddleSubscriptionEventData,
): Partial<typeof projectSubscriptions.$inferInsert> {
  const seatQuantity =
    data.items != null &&
    data.items.length > 0 &&
    data.items[0].quantity != null
      ? data.items[0].quantity
      : undefined

  const mappedStatus = mapPaddleStatus(data.status)

  const updates: Partial<typeof projectSubscriptions.$inferInsert> = {
    paddleSubscriptionId: data.id,
    updatedAt: new Date(),
  }

  if (data.customerId != null) {
    updates.paddleCustomerId = data.customerId
  }
  if (mappedStatus != null) {
    updates.status = mappedStatus
  }
  if (seatQuantity != null) {
    updates.seatQuantity = seatQuantity
  }
  const periodStart = parseDate(data.currentBillingPeriod?.startsAt)
  if (periodStart != null) {
    updates.currentPeriodStart = periodStart
  }
  const periodEnd = parseDate(data.currentBillingPeriod?.endsAt)
  if (periodEnd != null) {
    updates.currentPeriodEnd = periodEnd
  }
  const trialEnd = parseDate(data.trialDates?.endsAt)
  if (trialEnd != null) {
    updates.trialEndsAt = trialEnd
  }
  const canceledAt = parseDate(data.canceledAt)
  if (canceledAt != null) {
    updates.canceledAt = canceledAt
  }
  const scheduledCancelAt =
    data.scheduledChange?.action === 'cancel'
      ? parseDate(data.scheduledChange.effectiveAt)
      : null
  if (scheduledCancelAt != null) {
    updates.cancelAt = scheduledCancelAt
  }

  return updates
}

export async function upsertFromPaddleEvent(
  event: PaddleWebhookEvent,
): Promise<void> {
  switch (event.eventType) {
    case 'subscription.activated':
    case 'subscription.canceled':
    case 'subscription.created':
    case 'subscription.imported':
    case 'subscription.past_due':
    case 'subscription.paused':
    case 'subscription.resumed':
    case 'subscription.trialing':
    case 'subscription.updated':
      break
    default:
      return
  }

  const data = event.data
  const updates = buildSubscriptionUpdates(data)

  const existingByPaddleId = await db.query.projectSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.paddleSubscriptionId, data.id),
  })

  if (existingByPaddleId != null) {
    await db
      .update(projectSubscriptions)
      .set(updates)
      .where(eq(projectSubscriptions.id, existingByPaddleId.id))
    return
  }

  const subscriptionId = data.customData?.subscriptionId
  if (subscriptionId == null) {
    return
  }

  const existingById = await db.query.projectSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.id, subscriptionId),
  })
  if (existingById == null) {
    return
  }

  await db
    .update(projectSubscriptions)
    .set(updates)
    .where(eq(projectSubscriptions.id, existingById.id))
}

export async function applyPaddleSubscriptionToProject(input: {
  subscriptionId: string
  paddleSubscription: Subscription
}): Promise<ProjectSubscription> {
  const raw = input.paddleSubscription
  const mappedStatus = mapPaddleStatus(raw.status)
  const seatQuantity = raw.items[0]?.quantity

  const updates: Partial<typeof projectSubscriptions.$inferInsert> = {
    paddleSubscriptionId: raw.id,
    updatedAt: new Date(),
  }
  if (raw.customerId != null) {
    updates.paddleCustomerId = raw.customerId
  }
  if (mappedStatus != null) {
    updates.status = mappedStatus
  }
  if (seatQuantity != null) {
    updates.seatQuantity = seatQuantity
  }
  const periodStart = parseDate(raw.currentBillingPeriod?.startsAt)
  if (periodStart != null) {
    updates.currentPeriodStart = periodStart
  }
  const periodEnd = parseDate(raw.currentBillingPeriod?.endsAt)
  if (periodEnd != null) {
    updates.currentPeriodEnd = periodEnd
  }
  const trialEnd = parseDate(raw.items[0]?.trialDates?.endsAt)
  if (trialEnd != null) {
    updates.trialEndsAt = trialEnd
  }
  const canceledAt = parseDate(raw.canceledAt)
  if (canceledAt != null) {
    updates.canceledAt = canceledAt
  }
  const scheduledCancelAt =
    raw.scheduledChange?.action === 'cancel'
      ? parseDate(raw.scheduledChange.effectiveAt)
      : null
  if (scheduledCancelAt != null) {
    updates.cancelAt = scheduledCancelAt
  }

  await db
    .update(projectSubscriptions)
    .set(updates)
    .where(eq(projectSubscriptions.id, input.subscriptionId))

  const refreshed = await db.query.projectSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.id, input.subscriptionId),
  })
  if (refreshed == null) {
    throw new Error(
      'applyPaddleSubscriptionToProject: row vanished after update',
    )
  }
  return mapRow(refreshed)
}

export async function countActiveHumanOperators(
  projectId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(projectOperators)
    .where(
      and(
        eq(projectOperators.projectId, projectId),
        eq(projectOperators.type, 'user'),
      ),
    )
  return row?.value ?? 0
}

export async function assertSeatAvailable(
  projectId: string,
  billingUserId: string,
): Promise<ReturnResult<undefined>> {
  const subscription = await resolveProjectSubscription({
    projectId,
    billingUserId,
  })
  if (subscription.status !== 'trialing' && subscription.status !== 'active') {
    return err(new SubscriptionNotReadyError())
  }

  const humanCount = await countActiveHumanOperators(projectId)
  if (humanCount >= subscription.seatQuantity) {
    return err(new SeatLimitExceededError())
  }
  return ok()
}
