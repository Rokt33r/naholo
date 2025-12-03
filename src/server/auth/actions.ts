'use server'

import { auth } from './auth'
import { emailOTPAuthenticator } from './authenticators/email-otp'
import { getRequestMetadata } from './utils'
import type { ActionResult } from '@/server/types'
import { success, failure } from '@/server/types'

/**
 * Send OTP to email
 */
export async function sendOTPAction(
  email: string,
): Promise<ActionResult<{ otpId: string; signature: string }>> {
  const result = await emailOTPAuthenticator.sendOTP(email)

  if (!result.success) {
    console.error(result.error)
    return failure(result.error)
  }

  return success(result.data)
}

export async function verifyOTPAction(
  email: string,
  otpId: string,
  code: string,
  intent: 'sign-in' | 'sign-up',
  name?: string,
): Promise<ActionResult<undefined>> {
  const verifyingResult = await emailOTPAuthenticator.verifyOTP({
    email,
    otpId,
    code,
  })

  if (!verifyingResult.success) {
    console.error(verifyingResult.error)
    return failure(verifyingResult.error)
  }

  const identifier = verifyingResult.data

  const { ipAddress, userAgent } = await getRequestMetadata()
  const authenticationResult =
    intent === 'sign-in'
      ? await auth.signIn(identifier, {
          ipAddress,
          userAgent,
        })
      : await auth.signUp(
          identifier,
          { name },
          {
            ipAddress,
            userAgent,
          },
        )

  if (!authenticationResult.success) {
    console.error(authenticationResult.error)
    return failure(authenticationResult.error)
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
