import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import {
  countActiveHumanOperators,
  resolveProjectSubscription,
  finalizeCheckoutFromTransaction,
} from '@/server/services/project-subscription'
import type { ProjectSubscriptionView } from '../route'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project, projectOperator } = await requireAdminProjectOperator(
      projectSlug,
      { skipSubscriptionCheck: true },
    )

    const FinalizeCheckoutBodySchema = z.object({
      transactionId: z.string().min(1),
    })

    const body = await request.json()
    const parsed = FinalizeCheckoutBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    if (projectOperator.userId == null) {
      return NextResponse.json(
        { error: 'Bot operators cannot finalize checkout' },
        { status: 403 },
      )
    }

    const result = await finalizeCheckoutFromTransaction({
      projectId: project.id,
      paddleTransactionId: parsed.data.transactionId,
      billingUserId: projectOperator.userId,
    })

    if (!result.success) {
      throw result.error
    }

    const subscription = await resolveProjectSubscription({
      projectId: project.id,
      billingUserId: projectOperator.userId,
    })
    const usedSeats = await countActiveHumanOperators(project.id)

    const view: ProjectSubscriptionView = {
      projectId: project.id,
      status: subscription.status,
      seatQuantity: subscription.seatQuantity,
      usedSeats,
      hasPaddleSubscription: subscription.paddleSubscriptionId != null,
      isBillingUser: subscription.billingUserId === projectOperator.userId,
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
