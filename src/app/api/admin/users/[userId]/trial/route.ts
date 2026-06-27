import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireAppAdmin } from '@/server/auth/permissions'
import { setProjectTrialExpiration } from '@/server/services/project-trial'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await requireAppAdmin()
    const { userId } = await params

    const setTrialExpirationSchema = z.object({
      expiresAt: z.iso.datetime(),
    })
    const parsed = setTrialExpirationSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    const result = await setProjectTrialExpiration({
      userId,
      expiresAt: new Date(parsed.data.expiresAt),
    })

    return NextResponse.json(result)
  } catch (error) {
    return mapApiError(error)
  }
}
