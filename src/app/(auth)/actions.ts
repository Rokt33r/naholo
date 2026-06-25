'use server'

import * as Sentry from '@sentry/nextjs'
import { auth } from '../../server/auth/auth'
import { emailOTPAuthenticator } from '../../server/auth/authenticators/email-otp'
import { googleOAuthAuthenticator } from '../../server/auth/authenticators/google'
import { getRequestMetadata } from '../../server/auth/utils'
import { validateReturnTo } from '@/lib/validate-return-to'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { cookies } from 'next/headers'

export async function sendOTPAction(
  email: string,
): Promise<ReturnResult<{ otpId: string; signature: string }>> {
  try {
    const result = await emailOTPAuthenticator.sendOTP(email)

    if (!result.success) {
      return err(result.error)
    }

    return ok(result.data)
  } catch (error) {
    console.error('sendOTPAction failed:', error)
    Sentry.captureException(error, { tags: { authAction: 'send_otp' } })
    return err(error as Error)
  }
}

export async function verifyOTPForSigningUpAction(
  email: string,
  otpId: string,
  code: string,
  name?: string,
): Promise<ReturnResult<undefined>> {
  try {
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
  } catch (error) {
    console.error('verifyOTPForSigningUpAction failed:', error)
    Sentry.captureException(error, {
      tags: { authAction: 'verify_otp_sign_up' },
    })
    return err(error as Error)
  }
}

export async function verifyOTPForSigningInAction(
  email: string,
  otpId: string,
  code: string,
): Promise<ReturnResult<undefined>> {
  try {
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
  } catch (error) {
    console.error('verifyOTPForSigningInAction failed:', error)
    Sentry.captureException(error, {
      tags: { authAction: 'verify_otp_sign_in' },
    })
    return err(error as Error)
  }
}

export async function initiateGoogleOAuthAction(
  intent: 'sign-in' | 'sign-up',
  returnTo?: string,
): Promise<ReturnResult<{ authUrl: string }>> {
  const validatedReturnTo = validateReturnTo(returnTo)
  if (validatedReturnTo) {
    const cookieStore = await cookies()
    cookieStore.set('oauth_return_to', validatedReturnTo, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600, // 10 minutes, matches OAuth state expiry
      path: '/',
    })
  }

  const authUrl = googleOAuthAuthenticator.getAuthUrl(intent)
  return ok({ authUrl })
}
