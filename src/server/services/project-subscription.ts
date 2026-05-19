import 'server-only'
import { db } from '../db'
import { projectOperators } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { SeatLimitExceededError, SubscriptionNotReadyError } from '../errors'

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
  usedSeats: number
  isSeatExhausted: boolean
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

  const usedSeats = await countActiveOperators(projectId)
  const seatCap = polar.seats ?? 1
  const isSeatExhausted = usedSeats >= seatCap

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
    usedSeats,
    isSeatExhausted,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  }
}

export async function countActiveOperators(projectId: string): Promise<number> {
  return db.$count(projectOperators, eq(projectOperators.projectId, projectId))
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

  if (subscription.isSeatExhausted) {
    return err(new SeatLimitExceededError())
  }
  return ok()
}
