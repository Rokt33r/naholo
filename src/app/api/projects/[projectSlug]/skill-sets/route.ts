import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireProjectWorker } from '@/server/auth/permissions'
import { listSkillSets, createSkillSet } from '@/server/services/skill-set'
import { ConflictError } from '@/server/services/errors'

type RouteContext = {
  params: Promise<{
    projectSlug: string
  }>
}

/**
 * GET /api/projects/[projectSlug]/skill-sets
 * List skill sets for a project
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug } = await context.params
    const { project } = await requireProjectWorker(projectSlug)

    const skillSets = await listSkillSets(project.id)

    return NextResponse.json(skillSets)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const createSkillSetSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
})

/**
 * POST /api/projects/[projectSlug]/skill-sets
 * Create a new skill set
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug } = await context.params
    const { project } = await requireProjectWorker(projectSlug)

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = createSkillSetSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { name, slug } = validation.data

    const result = await createSkillSet(project.id, { name, slug })
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
