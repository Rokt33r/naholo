import { NextRequest, NextResponse } from 'next/server'
import { requireSkillSetAccess } from '@/server/auth/permissions'
import { listSkills } from '@/server/services/skill'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    skillSetSlug: string
  }>
}

/**
 * GET /api/projects/[projectSlug]/skill-sets/[skillSetSlug]/skills
 * List skills in a skill set
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, skillSetSlug } = await context.params
    const decodedSlug = decodeURIComponent(skillSetSlug)
    const { skillSet } = await requireSkillSetAccess(projectSlug, decodedSlug)

    const skills = await listSkills(skillSet.id)

    return NextResponse.json(skills)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
