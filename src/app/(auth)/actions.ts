'use server'

import { auth } from '../../server/auth/auth'
import { emailOTPAuthenticator } from '../../server/auth/authenticators/email-otp'
import { getRequestMetadata } from '../../server/auth/utils'
import { ActionResult, failure, success } from '../../server/types'

export async function sendOTPAction(
  email: string,
): Promise<ActionResult<{ otpId: string; signature: string }>> {
  const result = await emailOTPAuthenticator.sendOTP(email)

  if (!result.success) {
    return failure(result.error)
  }

  return success(result.data)
}

export async function verifyOTPForSigningUpAction(
  email: string,
  otpId: string,
  code: string,
  name?: string,
): Promise<ActionResult<undefined>> {
  const verifyingResult = await emailOTPAuthenticator.verifyOTP({
    email,
    otpId,
    code,
  })

  if (!verifyingResult.success) {
    return failure(verifyingResult.error)
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
    return failure(authenticationResult.error)
  }

  return success()
}

export async function verifyOTPForSigningInAction(
  email: string,
  otpId: string,
  code: string,
): Promise<ActionResult<undefined>> {
  const verifyingResult = await emailOTPAuthenticator.verifyOTP({
    email,
    otpId,
    code,
  })

  if (!verifyingResult.success) {
    return failure(verifyingResult.error)
  }

  const identifier = verifyingResult.data

  const { ipAddress, userAgent } = await getRequestMetadata()
  const authenticationResult = await auth.signIn(identifier, {
    ipAddress,
    userAgent,
  })

  if (!authenticationResult.success) {
    return failure(authenticationResult.error)
  }

  return success()
}
