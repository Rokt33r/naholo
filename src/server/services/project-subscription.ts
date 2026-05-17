import 'server-only'
import { db } from '../db'
import { projectSubscriptions, projectOperators, projects } from '../db/schema'
import { and, count, eq } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { SeatLimitExceededError, SubscriptionNotReadyError } from '../errors'
import { verifyProjectSubscriptionCheckoutToken } from '@/lib/billing/project-subscription-checkout-token'
import type { PaddleSubscriptionRow } from './paddle-subscription'

export type SubscriptionStatus =
  | 'incomplete'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'canceled'

export type ActiveProjectSubscription = {
  id: string
  projectId: string
  createdByOperatorId: string | null
  paddleSubscription: {
    id: string
    paddleSubscriptionId: string
    paddleCustomerId: string
    billingEmail: string
    status: SubscriptionStatus
    seatQuantity: number
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
    trialEndsAt: Date | null
    cancelAt: Date | null
    canceledAt: Date | null
  } | null
  polarSubscription: { id: string } | null
  createdAt: Date
  updatedAt: Date
}

export function isActiveSubscriptionStatus(
  status: SubscriptionStatus,
): boolean {
  return status === 'active' || status === 'trialing'
}

export async function getActiveProjectSubscription(
  projectId: string,
): Promise<ActiveProjectSubscription | null> {
  const project = await db.query.projects.findFirst({
    columns: { activeProjectSubscriptionId: true },
    with: {
      activeProjectSubscription: {
        with: {
          paddleSubscription: true,
          polarSubscription: { columns: { id: true } },
        },
      },
    },
    where: (t, { eq }) => eq(t.id, projectId),
  })

  const link = project?.activeProjectSubscription
  if (link == null) {
    return null
  }
  const paddle = link.paddleSubscription
  const polar = link.polarSubscription
  if (paddle == null && polar == null) {
    return null
  }

  return {
    id: link.id,
    projectId: link.projectId,
    createdByOperatorId: link.createdByOperatorId,
    paddleSubscription:
      paddle == null
        ? null
        : {
            id: paddle.id,
            paddleSubscriptionId: paddle.paddleSubscriptionId,
            paddleCustomerId: paddle.paddleCustomerId,
            billingEmail: paddle.billingEmail,
            status: paddle.status,
            seatQuantity: paddle.seatQuantity,
            currentPeriodStart: paddle.currentPeriodStart,
            currentPeriodEnd: paddle.currentPeriodEnd,
            trialEndsAt: paddle.trialEndsAt,
            cancelAt: paddle.cancelAt,
            canceledAt: paddle.canceledAt,
          },
    polarSubscription: polar == null ? null : { id: polar.id },
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  }
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

export type ClaimProjectSubscriptionResult =
  | {
      claimed: true
      projectSubscriptionId: string
      createdByOperatorId: string
    }
  | {
      claimed: false
      reason:
        | 'no-token'
        | 'invalid'
        | 'expired'
        | 'malformed'
        | 'unknown-project'
        | 'unknown-operator'
    }

export async function claimProjectSubscriptionFromEvent(input: {
  paddleSubscriptionRow: PaddleSubscriptionRow
  customData: unknown
}): Promise<ClaimProjectSubscriptionResult> {
  const { paddleSubscriptionRow, customData } = input

  const token =
    customData != null &&
    typeof customData === 'object' &&
    'projectSubscriptionCheckoutToken' in customData
      ? (customData as { projectSubscriptionCheckoutToken?: unknown })
          .projectSubscriptionCheckoutToken
      : undefined
  if (typeof token !== 'string' || token === '') {
    return { claimed: false, reason: 'no-token' }
  }

  const verified = await verifyProjectSubscriptionCheckoutToken(token)
  if (!verified.ok) {
    return { claimed: false, reason: verified.reason }
  }

  const { projectId, projectOperatorId } = verified

  const project = await db.query.projects.findFirst({
    columns: { id: true },
    where: (t, { eq }) => eq(t.id, projectId),
  })
  if (project == null) {
    return { claimed: false, reason: 'unknown-project' }
  }

  const operator = await db.query.projectOperators.findFirst({
    columns: { id: true, projectId: true },
    where: (t, { eq }) => eq(t.id, projectOperatorId),
  })
  if (operator == null || operator.projectId !== projectId) {
    return { claimed: false, reason: 'unknown-operator' }
  }

  const [inserted] = await db
    .insert(projectSubscriptions)
    .values({
      projectId,
      paddleSubscriptionId: paddleSubscriptionRow.id,
      createdByOperatorId: projectOperatorId,
    })
    .onConflictDoNothing({ target: projectSubscriptions.paddleSubscriptionId })
    .returning()

  if (inserted == null) {
    const existing = await db.query.projectSubscriptions.findFirst({
      where: (t, { eq }) =>
        eq(t.paddleSubscriptionId, paddleSubscriptionRow.id),
    })
    if (existing == null) {
      throw new Error(
        'claimProjectSubscriptionFromEvent: row vanished after conflict',
      )
    }
    return {
      claimed: true,
      projectSubscriptionId: existing.id,
      createdByOperatorId: projectOperatorId,
    }
  }

  await db
    .update(projects)
    .set({ activeProjectSubscriptionId: inserted.id, updatedAt: new Date() })
    .where(eq(projects.id, projectId))

  return {
    claimed: true,
    projectSubscriptionId: inserted.id,
    createdByOperatorId: projectOperatorId,
  }
}

export async function assertSeatAvailable(
  projectId: string,
): Promise<ReturnResult<undefined>> {
  const subscription = await getActiveProjectSubscription(projectId)
  if (subscription == null || subscription.paddleSubscription == null) {
    return err(new SubscriptionNotReadyError())
  }
  const status = subscription.paddleSubscription.status
  if (!isActiveSubscriptionStatus(status)) {
    return err(new SubscriptionNotReadyError())
  }

  const humanCount = await countActiveHumanOperators(projectId)
  if (humanCount >= subscription.paddleSubscription.seatQuantity) {
    return err(new SeatLimitExceededError())
  }
  return ok()
}
