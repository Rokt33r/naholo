import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRequestMetadata } from '@/server/auth/utils'
import { createCliLoginRequest } from '@/server/services/cli-login-request'

const createRequestSchema = z.object({
  state: z.string().min(1, 'State is required'),
  callbackUrl: z.string().min(1, 'Callback URL is required'),
})

/**
 * POST /api/auth/cli/requests
 * Create a CLI login request. No auth required.
 */
export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = createRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { state, callbackUrl } = validation.data

    // Validate callbackUrl is localhost
    if (
      !callbackUrl.startsWith('http://localhost:') &&
      !callbackUrl.startsWith('http://127.0.0.1:')
    ) {
      return NextResponse.json(
        { error: 'Callback URL must be a localhost URL' },
        { status: 400 },
      )
    }

    const { ipAddress } = await getRequestMetadata()
    const result = await createCliLoginRequest(
      state,
      callbackUrl,
      ipAddress || 'unknown',
    )

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
