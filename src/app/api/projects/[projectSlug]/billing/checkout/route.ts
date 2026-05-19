import { NextRequest, NextResponse } from 'next/server'
import { mapApiError, SubscriptionAlreadyActiveError } from '@/server/errors'
import {
  getAuthUser,
  requireAdminProjectOperator,
} from '@/server/auth/permissions'
import { db } from '@/server/db'
import { config, requirePolarConfig } from '@/server/config'
import { getPolarServerClient } from '@/server/billing/polar'
import {
  countActiveOperators,
  isActiveSubscriptionStatus,
} from '@/server/services/project-subscription'
import { formatProjectSubscriptionMetadata } from '@/server/billing/project-subscription-metadata'
import { reconcileProjectSubscriptionFromPolar } from '@/server/services/polar-project-subscription'

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

    const reconciled = await reconcileProjectSubscriptionFromPolar(project.id)
    if (reconciled.found && isActiveSubscriptionStatus(reconciled.status)) {
      throw new SubscriptionAlreadyActiveError()
    }

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
    const polarConfig = requirePolarConfig()

    const usedSeats = await countActiveOperators(project.id)
    const minSeats = Math.max(1, usedSeats)
    const successUrl = `${config.baseUrl}/app/projects/${projectSlug}/operators`

    let checkout
    if (existingPolarSubscription != null) {
      checkout = await polar.checkouts.create({
        products: [polarConfig.productId],
        customerId: existingPolarSubscription.polarCustomerId,
        allowDiscountCodes: true,
        minSeats,
        successUrl,
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

      checkout = await polar.checkouts.create({
        products: [polarConfig.productId],
        externalCustomerId: project.id,
        allowDiscountCodes: true,
        minSeats,
        successUrl,
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
