import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import { signProjectSubscriptionCheckoutToken } from '@/lib/billing/project-subscription-checkout-token'

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
    const { token, expiresAt } = await signProjectSubscriptionCheckoutToken({
      projectId: project.id,
      projectOperatorId: projectOperator.id,
    })
    return NextResponse.json({ token, expiresAt: expiresAt.toISOString() })
  } catch (error) {
    return mapApiError(error)
  }
}
