import { NextResponse } from 'next/server'
import { requireAdminOrNotFound } from '@/server/auth/utils'
import { listAllUsers } from '@/server/services/admin'

export async function GET() {
  try {
    await requireAdminOrNotFound()
    const users = await listAllUsers()
    return NextResponse.json(users)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
