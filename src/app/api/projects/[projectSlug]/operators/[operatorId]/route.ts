import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import {
  requireAdminProjectOperator,
  requireProjectOperator,
} from '@/server/auth/permissions'
import {
  deleteProjectOperator,
  updateProjectOperator,
} from '@/server/services/project-operator'
import { CALLSIGN_PATTERN } from '@/lib/callsign'

const patchOperatorSchema = z
  .object({
    name: z.string().min(1).optional(),
    callsign: z.string().regex(CALLSIGN_PATTERN).optional(),
  })
  .refine((body) => body.name != null || body.callsign != null, {
    message: 'At least one of name or callsign is required',
  })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string; operatorId: string }> },
) {
  try {
    const { projectSlug, operatorId } = await params
    const { project, projectOperator } =
      await requireProjectOperator(projectSlug)

    const isSelf = projectOperator.id === operatorId
    const isAdmin = projectOperator.role === 'admin'
    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = patchOperatorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      )
    }

    const updated = await updateProjectOperator(
      operatorId,
      project.id,
      parsed.data,
    )
    if (updated == null) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    return mapApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string; operatorId: string }> },
) {
  try {
    const { projectSlug, operatorId } = await params
    const { project } = await requireAdminProjectOperator(projectSlug, {
      skipSubscriptionCheck: true,
    })

    const { deleted } = await deleteProjectOperator(operatorId, project.id)
    if (!deleted) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return mapApiError(error)
  }
}
