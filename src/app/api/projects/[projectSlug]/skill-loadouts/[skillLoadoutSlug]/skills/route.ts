import { NextRequest, NextResponse } from 'next/server'
import { requireSkillLoadoutAccess } from '@/server/auth/permissions'
import { listSkills } from '@/server/services/skill'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    skillLoadoutSlug: string
  }>
}

/**
 * GET /api/projects/[projectSlug]/skill-loadouts/[skillLoadoutSlug]/skills
 * List skills in a skill loadout
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, skillLoadoutSlug } = await context.params
    const decodedSlug = decodeURIComponent(skillLoadoutSlug)
    const { skillLoadout } = await requireSkillLoadoutAccess(
      projectSlug,
      decodedSlug,
    )

    const skills = await listSkills(skillLoadout.id)

    return NextResponse.json(skills)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
