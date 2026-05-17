import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import { db } from '@/server/db'
import { requirePolarConfig } from '@/server/config'
import { getPolarServerClient } from '@/server/billing/polar'

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

    const link = await db.query.projectSubscriptions.findFirst({
      columns: {},
      with: {
        polarSubscription: {
          columns: { id: true, polarCustomerId: true },
        },
      },
      where: (t, { and, eq, isNotNull }) =>
        and(eq(t.projectId, project.id), isNotNull(t.polarSubscriptionId)),
    })
    if (link?.polarSubscription == null) {
      return NextResponse.json(
        {
          error:
            'This project has no subscription yet. Provision a trial first.',
        },
        { status: 409 },
      )
    }

    const polar = getPolarServerClient()
    const config = requirePolarConfig()
    const checkout = await polar.checkouts.create({
      products: [config.productId],
      customerId: link.polarSubscription.polarCustomerId,
      metadata: {
        projectId: project.id,
        projectOperatorId: projectOperator.id,
        polarSubscriptionId: link.polarSubscription.id,
      },
    })

    return NextResponse.json({
      url: checkout.url,
      expiresAt: checkout.expiresAt.toISOString(),
    })
  } catch (error) {
    return mapApiError(error)
  }
}
