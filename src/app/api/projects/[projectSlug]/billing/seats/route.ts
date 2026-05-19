import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  mapApiError,
  NotFoundError,
  SeatDowngradeBelowUsageError,
} from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import { getPolarServerClient } from '@/server/billing/polar'
import { upsertPolarSubscription } from '@/server/services/polar-subscription'
import {
  countActiveOperators,
  getActiveProjectSubscription,
} from '@/server/services/project-subscription'

const requestSchema = z.object({
  seats: z.number().int().positive(),
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

    const { seats } = requestSchema.parse(await request.json())

    const subscription = await getActiveProjectSubscription(project.id)
    if (subscription == null || subscription.polarSubscription == null) {
      throw new NotFoundError('Subscription')
    }

    const usedSeats = await countActiveOperators(project.id)
    if (seats < usedSeats) {
      throw new SeatDowngradeBelowUsageError({
        requestedSeats: seats,
        usedSeats,
      })
    }

    const polar = getPolarServerClient()
    const updated = await polar.subscriptions.update({
      id: subscription.polarSubscription.polarSubscriptionId,
      subscriptionUpdate: { seats },
    })
    const { row } = await upsertPolarSubscription(updated)

    return NextResponse.json({ ok: true, seats: row.seats ?? seats })
  } catch (error) {
    return mapApiError(error)
  }
}
