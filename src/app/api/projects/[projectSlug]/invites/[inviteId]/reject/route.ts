import { NextRequest, NextResponse } from 'next/server'
import { requireAdminProjectWorker } from '@/server/auth/permissions'
import {
  getProjectInvite,
  rejectProjectInvite,
} from '@/server/services/project-invite'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string; inviteId: string }> },
) {
  try {
    const { projectSlug, inviteId } = await params
    const { project } = await requireAdminProjectWorker(projectSlug)

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

    await rejectProjectInvite(inviteId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
