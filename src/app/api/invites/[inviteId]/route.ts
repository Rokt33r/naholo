import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/server/auth/permissions'
import { getProjectInvite } from '@/server/services/project-invite'
import { getProjectWorkerByUserId } from '@/server/services/project-worker'

export async function GET(
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

    // Hide invites claimed by someone else or rejected
    if (
      (invite.status === 'claimed' &&
        invite.claimerUserId != null &&
        invite.claimerUserId !== user.id) ||
      invite.status === 'rejected'
    ) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check if user is already a member
    const existingWorker = await getProjectWorkerByUserId(
      user.id,
      invite.projectId,
    )

    return NextResponse.json({
      id: invite.id,
      status: invite.status,
      projectName: invite.project.name,
      projectSlug: invite.project.slug,
      alreadyMember: existingWorker != null,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
