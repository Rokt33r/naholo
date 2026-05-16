import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError, NotFoundError } from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import { getPaddleServerClient } from '@/server/billing/paddle'

const requestBodySchema = z.object({
  code: z.string().trim().min(1).max(32),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    await requireAdminProjectOperator(projectSlug, {
      skipSubscriptionCheck: true,
    })

    const { code } = requestBodySchema.parse(await request.json())

    const paddle = getPaddleServerClient()
    const matches = await paddle.discounts
      .list({ code: [code], status: ['active'] })
      .next()
    const match = matches[0]
    if (match == null) {
      throw new NotFoundError('Discount')
    }

    return NextResponse.json({
      discount: {
        id: match.id,
        code: match.code ?? code,
        description: match.description,
        status: match.status,
      },
    })
  } catch (error) {
    return mapApiError(error)
  }
}
