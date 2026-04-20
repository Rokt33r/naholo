import { NextRequest, NextResponse } from 'next/server'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import {
  getProjectInvite,
  acceptProjectInvite,
} from '@/server/services/project-invite'
import { sendInviteAcceptedEmail } from '@/server/services/invite-email'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string; inviteId: string }> },
) {
  try {
    const { projectSlug, inviteId } = await params
    const { project } = await requireAdminProjectOperator(projectSlug)

    const invite = await getProjectInvite(inviteId)
    if (invite == null || invite.projectId !== project.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (invite.status !== 'claimed') {
      return NextResponse.json(
        { error: 'Invite is not in claimed status' },
        { status: 409 },
      )
    }

    if (invite.claimerUser == null) {
      return NextResponse.json(
        { error: 'Invite has no claimed user' },
        { status: 409 },
      )
    }

    const result = await acceptProjectInvite(inviteId, project.id, {
      id: invite.claimerUser.id,
      name: invite.claimerUser.name,
    })

    // Notify invitee (fire-and-forget)
    const inviteeEmail = invite.claimerUser.notificationEmail?.email
    if (inviteeEmail != null) {
      sendInviteAcceptedEmail(inviteeEmail, project.slug)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
