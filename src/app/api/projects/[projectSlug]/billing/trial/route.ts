import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import {
  getAuthUser,
  requireAdminProjectOperator,
} from '@/server/auth/permissions'
import { db } from '@/server/db'
import { provisionPolarTrialForProject } from '@/server/services/polar-trial'

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

    await provisionPolarTrialForProject({
      projectId: project.id,
      billingEmail: notificationEmail.email,
      createdByOperatorId: projectOperator.id,
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return mapApiError(error)
  }
}
