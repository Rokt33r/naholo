'use server'

import { auth } from '../../server/auth/auth'
import { emailOTPAuthenticator } from '../../server/auth/authenticators/email-otp'
import { googleOAuthAuthenticator } from '../../server/auth/authenticators/google'
import { getRequestMetadata } from '../../server/auth/utils'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'

export async function sendOTPAction(
  email: string,
): Promise<ReturnResult<{ otpId: string; signature: string }>> {
  const result = await emailOTPAuthenticator.sendOTP(email)

  if (!result.success) {
    return err(result.error)
  }

  return ok(result.data)
}

export async function verifyOTPForSigningUpAction(
  email: string,
  otpId: string,
  code: string,
  name?: string,
): Promise<ReturnResult<undefined>> {
  const verifyingResult = await emailOTPAuthenticator.verifyOTP({
    email,
    otpId,
    code,
  })

  if (!verifyingResult.success) {
    return err(verifyingResult.error)
  }

  const identifier = verifyingResult.data

  const { ipAddress, userAgent } = await getRequestMetadata()
  const authenticationResult = await auth.signUp(
    identifier,
    { name },
    {
      ipAddress,
      userAgent,
    },
  )

  if (!authenticationResult.success) {
    return err(authenticationResult.error)
  }

  return ok()
}

export async function verifyOTPForSigningInAction(
  email: string,
  otpId: string,
  code: string,
): Promise<ReturnResult<undefined>> {
  const verifyingResult = await emailOTPAuthenticator.verifyOTP({
    email,
    otpId,
    code,
  })

  if (!verifyingResult.success) {
    return err(verifyingResult.error)
  }

  const identifier = verifyingResult.data

  const { ipAddress, userAgent } = await getRequestMetadata()
  const authenticationResult = await auth.signIn(identifier, {
    ipAddress,
    userAgent,
  })

  if (!authenticationResult.success) {
    return err(authenticationResult.error)
  }

  return ok()
}

export async function initiateGoogleOAuthAction(
  intent: 'sign-in' | 'sign-up',
): Promise<ReturnResult<{ authUrl: string }>> {
  const authUrl = googleOAuthAuthenticator.getAuthUrl(intent)
  return ok({ authUrl })
}
