import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  mapApiError,
  NotFoundError,
  SeatLimitExceededError,
} from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import { getPolarServerClient } from '@/server/billing/polar'
import { upsertPolarSubscription } from '@/server/services/polar-subscription'
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
    if (subscription == null || subscription.polarSubscription == null) {
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

    const polar = getPolarServerClient()
    const updated = await polar.subscriptions.update({
      id: subscription.polarSubscription.polarSubscriptionId,
      subscriptionUpdate: { seats: quantity },
    })
    await upsertPolarSubscription(updated)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return mapApiError(error)
  }
}
