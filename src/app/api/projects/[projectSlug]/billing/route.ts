import { NextRequest, NextResponse } from 'next/server'
import { requireProjectOperator } from '@/server/auth/permissions'
import {
  countActiveHumanOperators,
  getProjectSubscription,
} from '@/server/services/project-subscription'

export type ProjectSubscriptionView = {
  projectId: string
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
    const { project, projectOperator } =
      await requireProjectOperator(projectSlug)

    const subscription = await getProjectSubscription(project.id)
    const usedSeats = await countActiveHumanOperators(project.id)

    const view: ProjectSubscriptionView = {
      projectId: project.id,
      status: subscription?.status ?? null,
      seatQuantity: subscription?.seatQuantity ?? 0,
      usedSeats,
      hasPaddleSubscription: subscription?.paddleSubscriptionId != null,
      isBillingUser:
        subscription != null &&
        projectOperator.userId != null &&
        subscription.billingUserId === projectOperator.userId,
      trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
      currentPeriodStart:
        subscription?.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
      cancelAt: subscription?.cancelAt?.toISOString() ?? null,
      canceledAt: subscription?.canceledAt?.toISOString() ?? null,
    }

    return NextResponse.json(view)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
