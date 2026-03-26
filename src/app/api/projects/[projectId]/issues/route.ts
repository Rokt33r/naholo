import { NextRequest, NextResponse } from 'next/server'
import { requireProjectWorker } from '@/server/auth/utils'
import { listIssues } from '@/server/services/issue'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params
    await requireProjectWorker(projectId)

    const searchParams = request.nextUrl.searchParams
    const closed = searchParams.get('closed') === 'true'

    const issues = await listIssues({ projectId, closed })

    return NextResponse.json(issues)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
