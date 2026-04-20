import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/server/auth/permissions'
import {
  claimProjectInvite,
  getProjectInvite,
} from '@/server/services/project-invite'
import { getProjectOperatorByUserId } from '@/server/services/project-operator'
import { sendInviteClaimedEmail } from '@/server/services/invite-email'
import { db } from '@/server/db'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> },
) {
  try {
    const { inviteId } = await params
    const user = await requireAuthUser()

    const invite = await getProjectInvite(inviteId)
    if (invite == null) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invite has already been claimed' },
        { status: 409 },
      )
    }

    // Check if user is already a member
    const existingOperator = await getProjectOperatorByUserId(
      user.id,
      invite.projectId,
    )
    if (existingOperator != null) {
      return NextResponse.json(
        { error: 'Already a member of this project' },
        { status: 409 },
      )
    }

    await claimProjectInvite(inviteId, user.id)

    // Send notification to project admins (fire-and-forget)
    notifyAdmins(invite.projectId, user, invite.project.slug)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

async function notifyAdmins(
  projectId: string,
  claimer: { id: string; name: string },
  projectName: string,
) {
  try {
    // Find admin workers with notification emails
    const admins = await db.query.projectOperators.findMany({
      where: (t, { eq, and, isNotNull }) =>
        and(
          eq(t.projectId, projectId),
          eq(t.role, 'admin'),
          isNotNull(t.userId),
        ),
      columns: {},
      with: {
        user: {
          columns: {},
          with: {
            notificationEmail: {
              columns: { email: true },
            },
          },
        },
      },
    })

    const adminEmails = admins
      .map((a) => a.user?.notificationEmail?.email)
      .filter((email): email is string => email != null)

    if (adminEmails.length === 0) {
      return
    }

    // Get claimer's identifiers for admin review
    const claimerIdentifiers = await db.query.userIdentifiers.findMany({
      where: (t, { eq }) => eq(t.userId, claimer.id),
      columns: { type: true, value: true },
    })

    await sendInviteClaimedEmail(
      adminEmails,
      claimer.name,
      claimerIdentifiers,
      projectName,
    )
  } catch (error) {
    console.error('Failed to notify admins:', error)
  }
}
