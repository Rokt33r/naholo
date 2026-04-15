import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminProjectWorker } from '@/server/auth/permissions'
import {
  createProjectInvite,
  listProjectInvites,
} from '@/server/services/project-invite'
import { sendInviteEmail } from '@/server/services/invite-email'
import { config } from '@/server/config'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project } = await requireAdminProjectWorker(projectSlug)

    const invites = await listProjectInvites(project.id)

    return NextResponse.json(invites)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const createInviteSchema = z.object({
  email: z.email(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project, projectWorker } =
      await requireAdminProjectWorker(projectSlug)

    const body = await request.json()
    const parsed = createInviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      )
    }

    const result = await createProjectInvite(
      project.id,
      parsed.data.email,
      projectWorker.id,
    )

    const inviteUrl = `${config.baseUrl}/app/invites/${result.data.id}`

    sendInviteEmail(
      parsed.data.email,
      inviteUrl,
      project.slug,
      projectWorker.name,
    )

    return NextResponse.json({ id: result.data.id, inviteUrl }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
