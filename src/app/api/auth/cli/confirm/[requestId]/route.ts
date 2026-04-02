import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/server/auth/permissions'
import {
  getCliLoginRequestById,
  isCliLoginRequestPending,
  issueCliLoginRequestCode,
} from '@/server/services/cli-login-request'

type RouteContext = {
  params: Promise<{
    requestId: string
  }>
}

/**
 * POST /api/auth/cli/confirm/[requestId]
 * Confirm a CLI login request. Requires session auth.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { requestId } = await context.params

    const loginRequest = await getCliLoginRequestById(requestId)
    if (!loginRequest || !isCliLoginRequestPending(loginRequest)) {
      return NextResponse.json(
        { error: 'Login request not found or expired' },
        { status: 404 },
      )
    }

    const result = await issueCliLoginRequestCode(requestId, user.id)
    const { code, callbackUrl } = result.data

    const redirectUrl = `${callbackUrl}?code=${code}`
    return NextResponse.json({ redirectUrl })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
