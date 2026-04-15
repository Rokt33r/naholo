import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthUser } from '@/server/auth/permissions'
import {
  getUserNotificationEmail,
  setUserNotificationEmail,
} from '@/server/services/user-notification-email'

export async function GET() {
  try {
    const user = await requireAuthUser()
    const email = await getUserNotificationEmail(user.id)

    return NextResponse.json({ email })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const updateNotificationEmailSchema = z.object({
  email: z.email(),
})

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuthUser()

    const body = await request.json()
    const parsed = updateNotificationEmailSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      )
    }

    await setUserNotificationEmail(user.id, parsed.data.email)

    return NextResponse.json({ email: parsed.data.email })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
