import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  requireProjectWorker,
  requireSkillSetAccess,
} from '@/server/auth/permissions'
import {
  getSkillSet,
  updateSkillSet,
  deleteSkillSet,
} from '@/server/services/skill-set'
import { ConflictError } from '@/server/services/errors'

type RouteContext = {
  params: Promise<{
    projectId: string
    skillSetSlug: string
  }>
}

/**
 * GET /api/projects/[projectId]/skill-sets/[skillSetSlug]
 * Get a single skill set
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { projectId, skillSetSlug } = await context.params
    await requireProjectWorker(projectId)

    const decodedSlug = decodeURIComponent(skillSetSlug)
    const skillSet = await getSkillSet(projectId, decodedSlug)
    if (skillSet == null) {
      return NextResponse.json(
        { error: 'Skill set not found' },
        { status: 404 },
      )
    }

    return NextResponse.json(skillSet)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const updateSkillSetSchema = z.object({
  name: z.string().min(1, 'Name must not be empty').trim().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
})

/**
 * PATCH /api/projects/[projectId]/skill-sets/[skillSetSlug]
 * Update a skill set
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, skillSetSlug } = await context.params
    const decodedSlug = decodeURIComponent(skillSetSlug)
    const { skillSet } = await requireSkillSetAccess(projectId, decodedSlug)

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = updateSkillSetSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const result = await updateSkillSet(skillSet.id, validation.data)
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 409 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/projects/[projectId]/skill-sets/[skillSetSlug]
 * Delete a skill set (cascades to skills)
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { projectId, skillSetSlug } = await context.params
    const decodedSlug = decodeURIComponent(skillSetSlug)
    const { skillSet } = await requireSkillSetAccess(projectId, decodedSlug)

    await deleteSkillSet(skillSet.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
