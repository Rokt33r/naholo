import { NextResponse } from 'next/server'
import { requireAppAdmin } from '@/server/auth/permissions'
import { refetchPaddleSubscriptionFromPaddle } from '@/server/admin/paddle-subscription'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAppAdmin()

  try {
    const { id } = await params
    const result = await refetchPaddleSubscriptionFromPaddle(id)
    if (result.ok) {
      return NextResponse.json(result)
    }
    const status = result.error === 'not_found' ? 404 : 500
    return NextResponse.json(result, { status })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 },
    )
  }
}
