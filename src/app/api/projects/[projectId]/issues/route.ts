import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/server/auth/utils'
import { listIssues } from '@/server/services/issue'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
    const searchParams = request.nextUrl.searchParams
    const closed = searchParams.get('closed') === 'true'

    const issues = await listIssues(user.id, projectId, { closed })

    return NextResponse.json(issues)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
