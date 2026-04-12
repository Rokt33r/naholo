import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSkillSetAccess } from '@/server/auth/permissions'
import { getSkill, upsertSkill, deleteSkill } from '@/server/services/skill'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    skillSetSlug: string
    skillName: string
  }>
}

/**
 * GET /api/projects/[projectId]/skill-sets/[skillSetSlug]/skills/[skillName]
 * Get a single skill with full content
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, skillSetSlug, skillName } = await context.params
    const decodedSlug = decodeURIComponent(skillSetSlug)
    const { skillSet } = await requireSkillSetAccess(projectSlug, decodedSlug)

    const decodedName = decodeURIComponent(skillName)
    const skill = await getSkill(skillSet.id, decodedName)
    if (skill == null) {
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

const upsertSkillSchema = z.object({
  content: z.string().min(1, 'Content is required'),
})

/**
 * PUT /api/projects/[projectId]/skill-sets/[skillSetSlug]/skills/[skillName]
 * Upsert a skill — create or update
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, skillSetSlug, skillName } = await context.params
    const decodedSlug = decodeURIComponent(skillSetSlug)
    const { skillSet } = await requireSkillSetAccess(projectSlug, decodedSlug)

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = upsertSkillSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const decodedName = decodeURIComponent(skillName)
    const result = await upsertSkill(skillSet.id, {
      name: decodedName,
      content: validation.data.content,
    })
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
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
 * DELETE /api/projects/[projectId]/skill-sets/[skillSetSlug]/skills/[skillName]
 * Delete a skill
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, skillSetSlug, skillName } = await context.params
    const decodedSlug = decodeURIComponent(skillSetSlug)
    const { skillSet } = await requireSkillSetAccess(projectSlug, decodedSlug)

    const decodedName = decodeURIComponent(skillName)
    const result = await deleteSkill(skillSet.id, decodedName)
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
