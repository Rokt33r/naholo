import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError, NotFoundError } from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import { getPaddleServerClient } from '@/server/billing/paddle'
import { upsertPaddleSubscriptionFromEvent } from '@/server/services/paddle-subscription'
import { getActiveProjectSubscription } from '@/server/services/project-subscription'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project } = await requireAdminProjectOperator(projectSlug, {
      skipSubscriptionCheck: true,
    })

    const requestSchema = z.object({
      action: z.enum(['cancel', 'resume']),
    })
    const { action } = requestSchema.parse(await request.json())

    const subscription = await getActiveProjectSubscription(project.id)
    if (subscription == null) {
      throw new NotFoundError('Subscription')
    }

    const paddleSubscriptionId =
      subscription.paddleSubscription.paddleSubscriptionId
    const paddle = getPaddleServerClient()
    const occurredAt = new Date()
    const data =
      action === 'cancel'
        ? await paddle.subscriptions.cancel(paddleSubscriptionId, {
            effectiveFrom: 'next_billing_period',
          })
        : await paddle.subscriptions.update(paddleSubscriptionId, {
            scheduledChange: null,
          })
    await upsertPaddleSubscriptionFromEvent({ data, occurredAt })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return mapApiError(error)
  }
}
