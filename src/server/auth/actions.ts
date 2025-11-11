'use server'

import { auth } from './auth'
import { getRequestMetadata } from './utils'
import type { ActionResult } from '@/server/types'
import { success, failure } from '@/server/types'

/**
 * Send OTP to email
 */
export async function sendOTPAction(
  email: string,
  intent: 'sign-in' | 'sign-up',
): Promise<ActionResult<{ otpId: string; signature: string }>> {
  const result = await auth.prepare({
    type: 'email-otp',
    intent,
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
export async function verifyOTPAction(
  email: string,
  otpId: string,
  code: string,
  intent: 'sign-in' | 'sign-up',
  name?: string,
): Promise<ActionResult<undefined>> {
  const metadata = await getRequestMetadata()

  const result = await auth.authenticate({
    type: 'email-otp',
    intent,
    data: { email, otpId, code, name },
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
  })

  if (!result.success) {
    return failure(result.error)
  }

  return success()
}

/**
 * Refresh current session
 */
export async function refreshSessionAction(): Promise<ActionResult<undefined>> {
  const result = await auth.refreshSession()

  if (!result.success) {
    return failure(result.error)
  }

  return success()
}

/**
 * Logout (invalidate session)
 */
export async function logoutAction(): Promise<ActionResult<undefined>> {
  await auth.signOut()
  return success()
}
