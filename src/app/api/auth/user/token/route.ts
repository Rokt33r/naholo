import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireAuthUser } from '@/server/auth/utils'
import { revokeUserApiTokenByToken } from '@/server/services/user-api-token'

/**
 * DELETE /api/auth/user/token — revoke the token used in the current request.
 * Only works with Bearer user API tokens (not session auth).
 */
export async function DELETE() {
  try {
    await requireAuthUser()
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const headersList = await headers()
  const authorization = headersList.get('authorization')

  if (
    authorization == null ||
    !authorization.startsWith('Bearer naholo_user_')
  ) {
    return NextResponse.json(
      { error: 'This endpoint requires a Bearer user API token' },
      { status: 401 },
    )
  }

  const token = authorization.slice('Bearer '.length)
  const result = await revokeUserApiTokenByToken(token)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Failed to revoke token' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}
