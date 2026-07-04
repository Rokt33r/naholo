import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import { updateProjectInviteRequest } from '@/server/services/project-invite'
import { CALLSIGN_PATTERN } from '@/lib/callsign'

// No uniqueness check on the requested callsign — accept stays authoritative.
const patchInviteSchema = z
  .object({
    name: z.string().min(1).optional(),
    callsign: z.string().regex(CALLSIGN_PATTERN).optional(),
  })
  .refine((body) => body.name != null || body.callsign != null, {
    message: 'At least one of name or callsign is required',
  })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string; inviteId: string }> },
) {
  try {
    const { projectSlug, inviteId } = await params
    const { project } = await requireAdminProjectOperator(projectSlug)

    const body = await request.json()
    const parsed = patchInviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      )
    }

    const updated = await updateProjectInviteRequest(
      inviteId,
      project.id,
      parsed.data,
    )
    if (updated == null) {
      return NextResponse.json(
        { error: 'Invite is not in claimed status' },
        { status: 409 },
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    return mapApiError(error)
  }
}
