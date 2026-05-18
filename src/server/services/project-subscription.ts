import 'server-only'
import { db } from '../db'
import { projectOperators } from '../db/schema'
import { and, count, eq } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { SeatLimitExceededError, SubscriptionNotReadyError } from '../errors'

export type SubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'

export type ActiveProjectSubscription = {
  id: string
  projectId: string
  polarSubscription: {
    id: string
    polarSubscriptionId: string
    polarCustomerId: string
    billingEmail: string
    status: string
    seats: number | null
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
    trialStart: Date | null
    trialEnd: Date | null
    cancelAtPeriodEnd: boolean
    canceledAt: Date | null
    startedAt: Date | null
    endsAt: Date | null
    endedAt: Date | null
  } | null
  createdAt: Date
  updatedAt: Date
}

export function isActiveSubscriptionStatus(status: string): boolean {
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
          polarSubscription: true,
        },
      },
    },
    where: (t, { eq }) => eq(t.id, projectId),
  })

  const link = project?.activeProjectSubscription
  if (link == null) {
    return null
  }
  const polar = link.polarSubscription
  if (polar == null) {
    return null
  }

  return {
    id: link.id,
    projectId: link.projectId,
    polarSubscription: {
      id: polar.id,
      polarSubscriptionId: polar.polarSubscriptionId,
      polarCustomerId: polar.polarCustomerId,
      billingEmail: polar.billingEmail,
      status: polar.status,
      seats: polar.seats,
      currentPeriodStart: polar.currentPeriodStart,
      currentPeriodEnd: polar.currentPeriodEnd,
      trialStart: polar.trialStart,
      trialEnd: polar.trialEnd,
      cancelAtPeriodEnd: polar.cancelAtPeriodEnd,
      canceledAt: polar.canceledAt,
      startedAt: polar.startedAt,
      endsAt: polar.endsAt,
      endedAt: polar.endedAt,
    },
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

export async function assertSeatAvailable(
  projectId: string,
): Promise<ReturnResult<undefined>> {
  const subscription = await getActiveProjectSubscription(projectId)
  if (subscription == null || subscription.polarSubscription == null) {
    return err(new SubscriptionNotReadyError())
  }
  const status = subscription.polarSubscription.status
  if (!isActiveSubscriptionStatus(status)) {
    return err(new SubscriptionNotReadyError())
  }

  const seatCap = subscription.polarSubscription.seats ?? 1
  const humanCount = await countActiveHumanOperators(projectId)
  if (humanCount >= seatCap) {
    return err(new SeatLimitExceededError())
  }
  return ok()
}
