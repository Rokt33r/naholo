import { NextResponse } from 'next/server'
import { requireAuthUser } from '@/server/auth/permissions'

export async function GET() {
  try {
    const user = await requireAuthUser()
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
