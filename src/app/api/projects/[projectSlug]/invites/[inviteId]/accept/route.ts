import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { mapApiError } from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import {
  getProjectInvite,
  acceptProjectInvite,
} from '@/server/services/project-invite'
import { sendInviteAcceptedEmail } from '@/server/services/invite-email'
import { db } from '@/server/db'
import { projectOperators, projects } from '@/server/db/schema'
import { deriveProjectStatus } from '@/server/services/project-status'

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

    const activeSubscription = await db.query.projectSubscriptions.findFirst({
      where: (t, { eq }) => eq(t.projectId, project.id),
      with: {
        polarSubscription: { columns: { status: true, seats: true } },
      },
    })
    const polarSubscription = activeSubscription?.polarSubscription ?? null
    const usedSeats = await db.$count(
      projectOperators,
      eq(projectOperators.projectId, project.id),
    )
    const projectTrial = await db.query.projectTrials.findFirst({
      columns: { expiresAt: true },
      where: (t, { eq }) => eq(t.projectId, project.id),
      orderBy: (t, { desc }) => desc(t.createdAt),
    })
    const { status, trialUntil } = deriveProjectStatus({
      polarStatus: polarSubscription?.status ?? null,
      seats: polarSubscription?.seats ?? null,
      usedSeats,
      trial: projectTrial ?? null,
    })
    await db
      .update(projects)
      .set({ status, trialUntil, updatedAt: new Date() })
      .where(eq(projects.id, project.id))

    // Notify invitee (fire-and-forget)
    const inviteeEmail = invite.claimerUser.notificationEmail?.email
    if (inviteeEmail != null) {
      sendInviteAcceptedEmail(inviteeEmail, project.slug)
    }

    return NextResponse.json(result)
  } catch (error) {
    return mapApiError(error)
  }
}
