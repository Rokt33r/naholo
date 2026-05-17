import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import {
  getAuthUser,
  requireAdminProjectOperator,
} from '@/server/auth/permissions'
import { db } from '@/server/db'
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

    const existingLink = await db.query.projectSubscriptions.findFirst({
      columns: {},
      with: {
        polarSubscription: {
          columns: { polarCustomerId: true },
        },
      },
      where: (t, { and, eq, isNotNull }) =>
        and(eq(t.projectId, project.id), isNotNull(t.polarSubscriptionId)),
    })
    const polarCustomerId = existingLink?.polarSubscription?.polarCustomerId
    if (polarCustomerId == null) {
      return NextResponse.json(
        { error: 'No Polar subscription exists for this project yet.' },
        { status: 404 },
      )
    }

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
            'Configure a notification email on your account before opening the billing portal.',
        },
        { status: 422 },
      )
    }

    const polar = getPolarServerClient()

    // TODO: Need to associate polar member id to projejct opr
    const member = await polar.members.createMember({
      customerId: polarCustomerId,
      email: notificationEmail.email,
      externalId: projectOperator.id,
      role: 'billing_manager',
    })

    const session = await polar.customerSessions.create({
      customerId: polarCustomerId,
      memberId: member.id,
    })

    return NextResponse.json({ url: session.customerPortalUrl })
  } catch (error) {
    return mapApiError(error)
  }
}
