import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  mapApiError,
  NotFoundError,
  SeatLimitExceededError,
} from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import { getPaddleServerClient } from '@/server/billing/paddle'
import { requirePaddleConfig } from '@/server/config'
import { upsertPaddleSubscriptionFromEvent } from '@/server/services/paddle-subscription'
import {
  countActiveHumanOperators,
  getActiveProjectSubscription,
} from '@/server/services/project-subscription'

const requestBodySchema = z.object({
  quantity: z.number().int().min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project } = await requireAdminProjectOperator(projectSlug, {
      skipSubscriptionCheck: true,
    })

    const { quantity } = requestBodySchema.parse(await request.json())

    const subscription = await getActiveProjectSubscription(project.id)
    if (subscription == null || subscription.paddleSubscription == null) {
      throw new NotFoundError('Subscription')
    }

    const usedSeats = await countActiveHumanOperators(project.id)
    if (quantity < usedSeats) {
      throw new SeatLimitExceededError(
        `Cannot reduce seats below the ${usedSeats} active human operator${
          usedSeats === 1 ? '' : 's'
        } currently in this project.`,
      )
    }

    const { priceId } = requirePaddleConfig()
    const paddleSubscriptionId =
      subscription.paddleSubscription.paddleSubscriptionId
    const paddle = getPaddleServerClient()
    const occurredAt = new Date()
    const data = await paddle.subscriptions.update(paddleSubscriptionId, {
      items: [{ priceId, quantity }],
      prorationBillingMode: 'prorated_immediately',
    })
    await upsertPaddleSubscriptionFromEvent({ data, occurredAt })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return mapApiError(error)
  }
}
