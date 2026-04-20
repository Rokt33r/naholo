import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/server/auth/permissions'
import { listProjects } from '@/server/services/project'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const withParam = request.nextUrl.searchParams.get('with')
    const withOption =
      withParam === 'projectOperatorOfCurrentUser'
        ? ('projectOperatorOfCurrentUser' as const)
        : undefined

    const projects = await listProjects(
      user.id,
      withOption ? { with: withOption } : undefined,
    )

    return NextResponse.json(projects)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
