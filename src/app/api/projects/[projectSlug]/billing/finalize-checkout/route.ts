import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import {
  countActiveHumanOperators,
  getProjectSubscription,
  finalizeCheckoutFromTransaction,
} from '@/server/services/project-subscription'
import { SubscriptionNotReadyError } from '@/server/services/errors'
import type { ProjectSubscriptionView } from '../route'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project, projectOperator } =
      await requireAdminProjectOperator(projectSlug)

    const FinalizeCheckoutBodySchema = z.object({
      transactionId: z.string().min(1),
    })

    const body = await request.json()
    const parsed = FinalizeCheckoutBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const result = await finalizeCheckoutFromTransaction({
      projectId: project.id,
      transactionId: parsed.data.transactionId,
    })

    if (!result.success) {
      if (result.error instanceof SubscriptionNotReadyError) {
        console.warn('Finalize checkout not ready:', {
          projectSlug,
          transactionId: parsed.data.transactionId,
          message: result.error.message,
        })
        return NextResponse.json(
          { error: 'Subscription not ready' },
          { status: 409 },
        )
      }
      console.error('Finalize checkout failed:', {
        projectSlug,
        transactionId: parsed.data.transactionId,
        error: result.error,
      })
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 },
      )
    }

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
    console.error('Finalize checkout route error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
