import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import {
  getAuthUser,
  requireAdminProjectOperator,
} from '@/server/auth/permissions'
import { db } from '@/server/db'
import { requirePolarConfig } from '@/server/config'
import { getPolarServerClient } from '@/server/billing/polar'
import { countActiveHumanOperators } from '@/server/services/project-subscription'
import { formatProjectSubscriptionMetadata } from '@/server/billing/project-subscription-metadata'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project, projectOperator } = await requireAdminProjectOperator(
      projectSlug,
      { skipSubscriptionCheck: true },
    )

    const existingLink = await db.query.projectSubscriptions.findFirst({
      columns: {},
      with: {
        polarSubscription: {
          columns: { id: true, polarCustomerId: true },
        },
      },
      where: (t, { and, eq, isNotNull }) =>
        and(eq(t.projectId, project.id), isNotNull(t.polarSubscriptionId)),
    })
    const existingPolarSubscription = existingLink?.polarSubscription ?? null

    const polar = getPolarServerClient()
    const config = requirePolarConfig()

    const usedSeats = await countActiveHumanOperators(project.id)
    const minSeats = Math.max(1, usedSeats)

    let checkout
    if (existingPolarSubscription != null) {
      checkout = await polar.checkouts.create({
        products: [config.productId],
        customerId: existingPolarSubscription.polarCustomerId,
        allowDiscountCodes: true,
        minSeats,
        metadata: formatProjectSubscriptionMetadata({
          projectId: project.id,
          projectOperatorId: projectOperator.id,
        }),
      })
    } else {
      const user = await getAuthUser()
      if (user == null) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
      }
      const notificationEmail = await db.query.userNotificationEmails.findFirst(
        {
          columns: { email: true },
          where: (t, { eq }) => eq(t.userId, user.id),
        },
      )
      if (notificationEmail == null) {
        return NextResponse.json(
          {
            error:
              'Configure a notification email on your account before starting checkout.',
          },
          { status: 422 },
        )
      }

      checkout = await polar.checkouts.create({
        products: [config.productId],
        customerEmail: notificationEmail.email,
        externalCustomerId: project.id,
        allowDiscountCodes: true,
        minSeats,
        metadata: formatProjectSubscriptionMetadata({
          projectId: project.id,
          projectOperatorId: projectOperator.id,
        }),
      })
    }

    return NextResponse.json({
      url: checkout.url,
      expiresAt: checkout.expiresAt.toISOString(),
    })
  } catch (error) {
    return mapApiError(error)
  }
}
