'use server'

import { auth } from './auth'
import { getRequestMetadata } from './utils'
import type { ActionResult } from '@/server/types'
import { success, failure } from '@/server/types'

/**
 * Send OTP to email
 */
export async function sendOTP(
  email: string,
): Promise<ActionResult<{ otpId: string; signature: string }>> {
  const result = await auth.prepare({
    type: 'email-otp',
    intent: 'sign-in',
    data: { email },
  })

  if (!result.success) {
    return failure(result.error)
  }

  return success(result.data)
}

/**
 * Verify OTP and create session
 */
export async function verifyOTP(
  email: string,
  otpId: string,
  code: string,
): Promise<ActionResult<undefined>> {
  const metadata = await getRequestMetadata()

  const result = await auth.authenticate({
    type: 'email-otp',
    intent: 'sign-in',
    data: { email, otpId, code },
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
  })

  if (!result.success) {
    return failure(result.error)
  }

  return success()
}

/**
 * Get authenticated user
 */
export async function getAuthUser(): Promise<
  ActionResult<{ id: string; name: string } | null>
> {
  const result = await auth.verifySession()

  if (!result.success) {
    return success(null)
  }

  const session = result.data
  const user = await auth.storage.getUserById(session.userId)

  if (!user) {
    return success(null)
  }

  return success({
    id: user.id,
    name: user.name,
  })
}

/**
 * Refresh current session
 */
export async function refreshSession(): Promise<ActionResult<undefined>> {
  const result = await auth.refreshSession()

  if (!result.success) {
    return failure(result.error)
  }

  return success()
}

/**
 * Logout (invalidate session)
 */
export async function logout(): Promise<ActionResult<undefined>> {
  await auth.signOut()
  return success()
}
