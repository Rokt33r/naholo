import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthUser } from '@/server/auth/permissions'
import {
  claimProjectInvite,
  getProjectInvite,
} from '@/server/services/project-invite'
import { getProjectOperatorByUserId } from '@/server/services/project-operator'
import { sendInviteClaimedEmail } from '@/server/services/invite-email'
import { db } from '@/server/db'
import { CALLSIGN_PATTERN } from '@/lib/callsign'

// Deliberately no uniqueness check and no lookup against existing callsigns —
// this endpoint is reachable by any invite-link holder and must not leak
// which callsigns are in use.
const claimInviteSchema = z.object({
  name: z.string().min(1),
  callsign: z.string().regex(CALLSIGN_PATTERN),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> },
) {
  try {
    const { inviteId } = await params
    const user = await requireAuthUser()

    const body = await request.json().catch(() => ({}))
    const parsed = claimInviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      )
    }

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

    await claimProjectInvite(inviteId, user.id, {
      name: parsed.data.name,
      callsign: parsed.data.callsign,
    })

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
    // Find admin operators with notification emails
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
