import { NextResponse } from 'next/server'
import { getAuthUser } from '@/server/auth/utils'
import { listProjects } from '@/server/services/project'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await listProjects(user.id)

    return NextResponse.json(projects)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
