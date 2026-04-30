import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
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
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, skillLoadoutSlug } = await context.params
    const decodedSlug = decodeURIComponent(skillLoadoutSlug)
    const { skillLoadout } = await requireSkillLoadoutAccess(
      projectSlug,
      decodedSlug,
    )

    const withParam = request.nextUrl.searchParams.get('with')
    const withContent = withParam === 'content'

    const skills = await listSkills(skillLoadout.id, { withContent })

    return NextResponse.json(skills)
  } catch (error) {
    return mapApiError(error)
  }
}
