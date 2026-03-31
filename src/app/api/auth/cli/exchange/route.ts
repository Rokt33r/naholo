import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRequestMetadata } from '@/server/auth/utils'
import {
  getCliLoginRequestById,
  isCliLoginRequestConsumable,
  markCliLoginRequestConsumed,
} from '@/server/services/cli-login-request'
import { createUserApiToken } from '@/server/services/user-api-token'

const exchangeSchema = z.object({
  state: z.string().min(1, 'State is required'),
  requestId: z.string().min(1, 'Request ID is required'),
  code: z.string().min(1, 'Code is required'),
  tokenName: z.string().min(1, 'Token name is required'),
})

/**
 * POST /api/auth/cli/exchange
 * Exchange a CLI login code for a user API token. No auth required.
 */
export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = exchangeSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { state, requestId, code, tokenName } = validation.data

    const loginRequest = await getCliLoginRequestById(requestId)
    if (!loginRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify state matches
    if (loginRequest.state !== state) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify code matches and request is consumable
    if (
      loginRequest.code !== code ||
      !isCliLoginRequestConsumable(loginRequest)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify IP matches
    // const { ipAddress } = await getRequestMetadata()
    // if (loginRequest.ipAddress !== (ipAddress || 'unknown')) {
    //   return NextResponse.json(
    //     { error: 'IP address mismatch' },
    //     { status: 403 },
    //   )
    // }

    // Mark as consumed
    await markCliLoginRequestConsumed(requestId)

    // Create user API token
    const result = await createUserApiToken(loginRequest.userId!, {
      name: tokenName,
    })

    return NextResponse.json({
      token: result.data.token,
      tokenHint: result.data.tokenHint,
      tokenName,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
