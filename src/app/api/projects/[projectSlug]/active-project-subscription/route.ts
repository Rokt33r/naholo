import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import { requireProjectOperator } from '@/server/auth/permissions'
import {
  countActiveHumanOperators,
  getActiveProjectSubscription,
  type ActiveProjectSubscription,
  type SubscriptionStatus,
} from '@/server/services/project-subscription'
export type ActiveProjectSubscriptionResponse = {
  subscription: {
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
      currentPeriodStart: string | null
      currentPeriodEnd: string | null
      trialEndsAt: string | null
      cancelAt: string | null
      canceledAt: string | null
    } | null
    polarSubscription: {
      id: string
      polarSubscriptionId: string
      polarCustomerId: string
      billingEmail: string
      status: string
      seats: number | null
      currentPeriodStart: string | null
      currentPeriodEnd: string | null
      trialStart: string | null
      trialEnd: string | null
      cancelAtPeriodEnd: boolean
      canceledAt: string | null
      startedAt: string | null
      endsAt: string | null
      endedAt: string | null
    } | null
    createdAt: string
    updatedAt: string
  } | null
  usedSeats: number
}

// TODO If we still using this serialize stuff, we need to move this to service so other route can share.
function serializeDates(
  subscription: ActiveProjectSubscription,
): ActiveProjectSubscriptionResponse['subscription'] {
  const p = subscription.paddleSubscription
  return {
    id: subscription.id,
    projectId: subscription.projectId,
    createdByOperatorId: subscription.createdByOperatorId,
    paddleSubscription:
      p == null
        ? null
        : {
            id: p.id,
            paddleSubscriptionId: p.paddleSubscriptionId,
            paddleCustomerId: p.paddleCustomerId,
            billingEmail: p.billingEmail,
            status: p.status,
            seatQuantity: p.seatQuantity,
            currentPeriodStart: p.currentPeriodStart?.toISOString() ?? null,
            currentPeriodEnd: p.currentPeriodEnd?.toISOString() ?? null,
            trialEndsAt: p.trialEndsAt?.toISOString() ?? null,
            cancelAt: p.cancelAt?.toISOString() ?? null,
            canceledAt: p.canceledAt?.toISOString() ?? null,
          },
    polarSubscription:
      subscription.polarSubscription == null
        ? null
        : {
            id: subscription.polarSubscription.id,
            polarSubscriptionId:
              subscription.polarSubscription.polarSubscriptionId,
            polarCustomerId: subscription.polarSubscription.polarCustomerId,
            billingEmail: subscription.polarSubscription.billingEmail,
            status: subscription.polarSubscription.status,
            seats: subscription.polarSubscription.seats,
            currentPeriodStart:
              subscription.polarSubscription.currentPeriodStart?.toISOString() ??
              null,
            currentPeriodEnd:
              subscription.polarSubscription.currentPeriodEnd?.toISOString() ??
              null,
            trialStart:
              subscription.polarSubscription.trialStart?.toISOString() ?? null,
            trialEnd:
              subscription.polarSubscription.trialEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: subscription.polarSubscription.cancelAtPeriodEnd,
            canceledAt:
              subscription.polarSubscription.canceledAt?.toISOString() ?? null,
            startedAt:
              subscription.polarSubscription.startedAt?.toISOString() ?? null,
            endsAt:
              subscription.polarSubscription.endsAt?.toISOString() ?? null,
            endedAt:
              subscription.polarSubscription.endedAt?.toISOString() ?? null,
          },
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project } = await requireProjectOperator(projectSlug, {
      skipSubscriptionCheck: true,
    })

    const subscription = await getActiveProjectSubscription(project.id)
    const usedSeats = await countActiveHumanOperators(project.id)

    const body: ActiveProjectSubscriptionResponse = {
      subscription: subscription == null ? null : serializeDates(subscription),
      usedSeats,
    }
    return NextResponse.json(body)
  } catch (error) {
    return mapApiError(error)
  }
}
