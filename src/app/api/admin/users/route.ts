import { NextResponse } from 'next/server'
import { requireAppAdmin } from '@/server/auth/permissions'
import { listAllUsers } from '@/server/services/admin'

export async function GET() {
  try {
    await requireAppAdmin()
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
