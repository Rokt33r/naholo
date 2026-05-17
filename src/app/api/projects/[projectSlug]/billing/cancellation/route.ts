import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError, NotFoundError } from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import { getPolarServerClient } from '@/server/billing/polar'
import { upsertPolarSubscription } from '@/server/services/polar-subscription'
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
    if (subscription == null || subscription.polarSubscription == null) {
      throw new NotFoundError('Subscription')
    }

    const polar = getPolarServerClient()
    const updated = await polar.subscriptions.update({
      id: subscription.polarSubscription.polarSubscriptionId,
      subscriptionUpdate: { cancelAtPeriodEnd: action === 'cancel' },
    })
    await upsertPolarSubscription(updated)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return mapApiError(error)
  }
}
