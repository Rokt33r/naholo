import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  requireProjectWorker,
  requireAdminProjectWorker,
} from '@/server/auth/utils'
import { getSkill, updateSkill, deleteSkill } from '@/server/services/skill'
import { ConflictError } from '@/server/services/errors'

type RouteContext = {
  params: Promise<{
    projectId: string
    skillId: string
  }>
}

/**
 * GET /api/projects/[projectId]/skills/[skillId]
 * Get a single skill with full content
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { projectId, skillId } = await context.params
    await requireProjectWorker(projectId)

    const skill = await getSkill(projectId, skillId)
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    return NextResponse.json(skill)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const updateSkillSchema = z.object({
  name: z.string().min(1, 'Name must not be empty string').trim().optional(),
  content: z.string().min(1, 'Content must not be empty string').optional(),
  expectedRevisionId: z.string().uuid().optional(),
})

/**
 * PATCH /api/projects/[projectId]/skills/[skillId]
 * Update a skill
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, skillId } = await context.params
    await requireAdminProjectWorker(projectId)

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = updateSkillSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const result = await updateSkill(projectId, skillId, validation.data)
    if (!result.success) {
      if (result.error instanceof ConflictError) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: result.error.message }, { status: 404 })
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
 * DELETE /api/projects/[projectId]/skills/[skillId]
 * Delete a skill
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { projectId, skillId } = await context.params
    await requireAdminProjectWorker(projectId)

    const result = await deleteSkill(projectId, skillId)
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
