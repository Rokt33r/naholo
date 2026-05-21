import { NextRequest, NextResponse } from 'next/server'
import { mapApiError, SubscriptionAlreadyActiveError } from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import { config, requirePolarConfig } from '@/server/config'
import { getPolarServerClient } from '@/server/billing/polar'
import {
  countActiveOperators,
  isActiveSubscriptionStatus,
} from '@/server/services/project-subscription'
import { reconcileProjectSubscriptionFromPolar } from '@/server/services/polar-project-subscription'
import { ProjectSubscriptionMetadata } from '@/server/services/polar-subscription'

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

    const polar = getPolarServerClient()
    const polarConfig = requirePolarConfig()

    const usedSeats = await countActiveOperators(project.id)
    const minSeats = Math.max(1, usedSeats)
    const successUrl = `${config.baseUrl}/app/projects/${projectSlug}/operators`
    const metadata: ProjectSubscriptionMetadata = {
      projectId: project.id,
      projectOperatorId: projectOperator.id,
    }

    const checkout = await polar.checkouts.create({
      products: [polarConfig.productId],
      externalCustomerId: project.id,
      allowDiscountCodes: true,
      minSeats,
      successUrl,
      metadata,
    })

    return NextResponse.json({
      url: checkout.url,
      expiresAt: checkout.expiresAt.toISOString(),
    })
  } catch (error) {
    return mapApiError(error)
  }
}
