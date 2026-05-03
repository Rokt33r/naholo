import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  mapApiError,
  PaddleTransactionNotReadyError,
  PaddleTransactionTamperedError,
} from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import {
  applyPaddleSubscriptionToProject,
  countActiveHumanOperators,
  resolveProjectSubscription,
  type ProjectSubscription,
} from '@/server/services/project-subscription'
import { paddleServerClient } from '@/server/billing/paddle'
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

    const subscription = await resolveProjectSubscription({
      projectId: project.id,
      billingUserId: projectOperator.userId,
    })

    // Idempotency: once Paddle's subscription id is attached we are done —
    // no further Paddle calls, no replay risk. Just return the current view.
    if (subscription.paddleSubscriptionId != null) {
      const usedSeats = await countActiveHumanOperators(project.id)
      return NextResponse.json(
        buildBillingView(
          project.id,
          subscription,
          usedSeats,
          projectOperator.userId,
        ),
      )
    }

    const transaction = await paddleServerClient.transactions.get(
      parsed.data.transactionId,
    )

    const customData = transaction.customData as
      | { projectId?: string; subscriptionId?: string }
      | null
      | undefined
    if (
      customData?.projectId !== project.id ||
      customData?.subscriptionId !== subscription.id
    ) {
      console.error('Tampered Paddle transaction', {
        projectId: project.id,
        subscriptionId: subscription.id,
        customData,
      })
      throw new PaddleTransactionTamperedError()
    }

    if (transaction.subscriptionId == null) {
      throw new PaddleTransactionNotReadyError()
    }

    const paddleSub = await paddleServerClient.subscriptions.get(
      transaction.subscriptionId,
    )
    const updated = await applyPaddleSubscriptionToProject({
      subscriptionId: subscription.id,
      paddleSubscription: paddleSub,
    })

    const usedSeats = await countActiveHumanOperators(project.id)
    return NextResponse.json(
      buildBillingView(project.id, updated, usedSeats, projectOperator.userId),
    )
  } catch (error) {
    return mapApiError(error)
  }
}

function buildBillingView(
  projectId: string,
  subscription: ProjectSubscription,
  usedSeats: number,
  authenticatedUserId: string,
): ProjectSubscriptionView {
  return {
    projectId,
    subscriptionId: subscription.id,
    status: subscription.status,
    seatQuantity: subscription.seatQuantity,
    usedSeats,
    hasPaddleSubscription: subscription.paddleSubscriptionId != null,
    isBillingUser: subscription.billingUserId === authenticatedUserId,
    trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
    currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAt: subscription.cancelAt?.toISOString() ?? null,
    canceledAt: subscription.canceledAt?.toISOString() ?? null,
  }
}
