import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import { requireProjectOperator } from '@/server/auth/permissions'
import {
  countActiveHumanOperators,
  resolveProjectSubscription,
} from '@/server/services/project-subscription'

export type ProjectSubscriptionView = {
  projectId: string
  subscriptionId: string
  status:
    | 'incomplete'
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'paused'
    | 'canceled'
    | null
  seatQuantity: number
  usedSeats: number
  hasPaddleSubscription: boolean
  isBillingUser: boolean
  trialEndsAt: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAt: string | null
  canceledAt: string | null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project, projectOperator } = await requireProjectOperator(
      projectSlug,
      { skipSubscriptionCheck: true },
    )

    const subscription = await resolveProjectSubscription({
      projectId: project.id,
      billingUserId: projectOperator.userId ?? '',
    })
    const usedSeats = await countActiveHumanOperators(project.id)

    const view: ProjectSubscriptionView = {
      projectId: project.id,
      subscriptionId: subscription.id,
      status: subscription.status,
      seatQuantity: subscription.seatQuantity,
      usedSeats,
      hasPaddleSubscription: subscription.paddleSubscriptionId != null,
      isBillingUser:
        projectOperator.userId != null &&
        subscription.billingUserId === projectOperator.userId,
      trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
      currentPeriodStart:
        subscription.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      cancelAt: subscription.cancelAt?.toISOString() ?? null,
      canceledAt: subscription.canceledAt?.toISOString() ?? null,
    }

    return NextResponse.json(view)
  } catch (error) {
    return mapApiError(error)
  }
}
