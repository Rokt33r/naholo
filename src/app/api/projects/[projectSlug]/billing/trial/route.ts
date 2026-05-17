import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import {
  getAuthUser,
  requireAdminProjectOperator,
} from '@/server/auth/permissions'
import { db } from '@/server/db'
import { createPolarTrialCheckout } from '@/server/services/polar-trial'

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

    const existing = await db.query.projectSubscriptions.findFirst({
      columns: { id: true },
      where: (t, { and, eq, isNotNull }) =>
        and(eq(t.projectId, project.id), isNotNull(t.polarSubscriptionId)),
    })
    if (existing != null) {
      return NextResponse.json(
        { error: 'This project already has a subscription.' },
        { status: 409 },
      )
    }

    // TODO Make requireProjectOperator to include auth user in return value if it is fetching auth user already. Otherwise, resolve user from userId in getAuthUser.
    const user = await getAuthUser()
    if (user == null) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    const notificationEmail = await db.query.userNotificationEmails.findFirst({
      columns: { email: true },
      where: (t, { eq }) => eq(t.userId, user.id),
    })
    if (notificationEmail == null) {
      return NextResponse.json(
        {
          error:
            'Configure a notification email on your account before starting a trial.',
        },
        { status: 422 },
      )
    }

    const checkout = await createPolarTrialCheckout({
      projectId: project.id,
      billingEmail: notificationEmail.email,
      createdByOperatorId: projectOperator.id,
    })
    if (checkout == null) {
      return NextResponse.json(
        { error: 'Billing is not enabled.' },
        { status: 503 },
      )
    }

    return NextResponse.json({
      url: checkout.url,
      expiresAt: checkout.expiresAt.toISOString(),
    })
  } catch (error) {
    return mapApiError(error)
  }
}
