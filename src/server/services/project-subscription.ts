import 'server-only'
import { db } from '../db'
import { projectSubscriptions, projectOperators } from '../db/schema'
import { and, count, eq } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { SeatLimitExceededError, SubscriptionNotReadyError } from './errors'

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

export async function getProjectSubscription(
  projectId: string,
): Promise<ProjectSubscription | null> {
  const row = await db.query.projectSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.projectId, projectId),
  })
  if (row == null) {
    return null
  }
  return mapRow(row)
}

export async function createIncompleteSubscription(input: {
  projectId: string
  billingUserId: string
}): Promise<ProjectSubscription> {
  const existing = await getProjectSubscription(input.projectId)
  if (existing != null) {
    return existing
  }

  const [row] = await db
    .insert(projectSubscriptions)
    .values({
      projectId: input.projectId,
      billingUserId: input.billingUserId,
      status: 'incomplete',
      seatQuantity: 1,
    })
    .returning()

  return mapRow(row)
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
  customData?: { projectId?: string } | null
  trialDates?: { endsAt?: string | null } | null
}

type PaddleTransactionEventData = {
  id: string
  subscriptionId?: string | null
  customerId?: string | null
  status?: string
  customData?: { projectId?: string } | null
}

export type PaddleWebhookEvent =
  | {
      eventType:
        | 'subscription.created'
        | 'subscription.updated'
        | 'subscription.canceled'
        | 'subscription.past_due'
        | 'subscription.paused'
      data: PaddleSubscriptionEventData
    }
  | {
      eventType: 'transaction.completed'
      data: PaddleTransactionEventData
    }

export async function upsertFromPaddleEvent(
  event: PaddleWebhookEvent,
): Promise<void> {
  switch (event.eventType) {
    case 'subscription.created':
    case 'subscription.updated':
    case 'subscription.canceled':
    case 'subscription.past_due':
    case 'subscription.paused':
      break
    default:
      return
  }

  const data = event.data
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

  const projectId = data.customData?.projectId
  if (projectId == null) {
    return
  }

  const existingByProject = await getProjectSubscription(projectId)
  if (existingByProject == null) {
    return
  }

  await db
    .update(projectSubscriptions)
    .set(updates)
    .where(eq(projectSubscriptions.id, existingByProject.id))
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
): Promise<ReturnResult<undefined>> {
  const subscription = await getProjectSubscription(projectId)
  if (subscription == null) {
    return err(new SubscriptionNotReadyError())
  }
  if (subscription.status !== 'trialing' && subscription.status !== 'active') {
    return err(new SubscriptionNotReadyError())
  }

  const humanCount = await countActiveHumanOperators(projectId)
  if (humanCount >= subscription.seatQuantity) {
    return err(new SeatLimitExceededError())
  }
  return ok()
}
