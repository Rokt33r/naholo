import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/server/auth/utils'
import { getIssues } from '@/app/app/dal'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const searchParams = request.nextUrl.searchParams
  const closed = searchParams.get('closed') === 'true'

  const issues = await getIssues(projectId, closed)

  return NextResponse.json(issues)
}
