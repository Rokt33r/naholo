import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import {
  requireProjectOperator,
  requireSkillLoadoutAccess,
} from '@/server/auth/permissions'
import {
  getSkillLoadoutBySlug,
  updateSkillLoadout,
  deleteSkillLoadout,
} from '@/server/services/skill-loadout'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    skillLoadoutSlug: string
  }>
}

/**
 * GET /api/projects/[projectSlug]/skill-loadouts/[skillLoadoutSlug]
 * Get a single skill loadout
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, skillLoadoutSlug } = await context.params
    const { project } = await requireProjectOperator(projectSlug)

    const decodedSlug = decodeURIComponent(skillLoadoutSlug)
    const skillLoadout = await getSkillLoadoutBySlug(project.id, decodedSlug)
    if (skillLoadout == null) {
      return NextResponse.json(
        { error: 'Skill Loadout not found' },
        { status: 404 },
      )
    }

    return NextResponse.json(skillLoadout)
  } catch (error) {
    return mapApiError(error)
  }
}

const updateSkillLoadoutSchema = z.object({
  name: z.string().min(1, 'Name must not be empty').trim().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
})

/**
 * PATCH /api/projects/[projectSlug]/skill-loadouts/[skillLoadoutSlug]
 * Update a skill loadout
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, skillLoadoutSlug } = await context.params
    const decodedSlug = decodeURIComponent(skillLoadoutSlug)
    const { skillLoadout } = await requireSkillLoadoutAccess(
      projectSlug,
      decodedSlug,
    )

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = updateSkillLoadoutSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const result = await updateSkillLoadout(skillLoadout.id, validation.data)
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 409 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    return mapApiError(error)
  }
}

/**
 * DELETE /api/projects/[projectSlug]/skill-loadouts/[skillLoadoutSlug]
 * Delete a skill loadout (cascades to skills)
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, skillLoadoutSlug } = await context.params
    const decodedSlug = decodeURIComponent(skillLoadoutSlug)
    const { skillLoadout } = await requireSkillLoadoutAccess(
      projectSlug,
      decodedSlug,
    )

    await deleteSkillLoadout(skillLoadout.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return mapApiError(error)
  }
}
