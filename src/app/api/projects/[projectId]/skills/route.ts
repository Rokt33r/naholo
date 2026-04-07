import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireProjectWorker } from '@/server/auth/permissions'
import { listSkills, createSkill } from '@/server/services/skill'
import { ConflictError } from '@/server/services/errors'

type RouteContext = {
  params: Promise<{
    projectId: string
  }>
}

/**
 * GET /api/projects/[projectId]/skills
 * List skills for a project
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { projectId } = await context.params
    await requireProjectWorker(projectId)

    const skills = await listSkills(projectId)

    return NextResponse.json(skills)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const createSkillSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  content: z.string().min(1, 'Content is required'),
})

/**
 * POST /api/projects/[projectId]/skills
 * Create a new skill
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectId } = await context.params
    await requireProjectWorker(projectId)

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = createSkillSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { name, content } = validation.data

    const result = await createSkill(projectId, { name, content })
    if (!result.success) {
      if (result.error instanceof ConflictError) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
