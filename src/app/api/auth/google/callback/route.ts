import { NextRequest, NextResponse } from 'next/server'
import { KenmonGoogleOAuthError } from '@kenmon/google-oauth-authenticator'
import { cookies } from 'next/headers'
import { auth } from '../../../../../server/auth/auth'
import { googleOAuthAuthenticator } from '../../../../../server/auth/authenticators/google'
import { getRequestMetadata } from '../../../../../server/auth/utils'
import { validateReturnTo } from '../../../../../lib/validate-return-to'
import { config } from '../../../../../server/config'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/sign-in?error=missing_parameters', config.baseUrl),
    )
  }

  try {
    const result = await googleOAuthAuthenticator.verifyCallback(code, state)

    if (!result.success) {
      console.error('Google OAuth verification failed:')
      console.error(result.error)
      return NextResponse.redirect(
        new URL('/sign-in?error=oauth_verification_failed', config.baseUrl),
      )
    }

    const { intent, identifier } = result.data

    const { ipAddress, userAgent } = await getRequestMetadata()

    if (intent === 'sign-in') {
      const signInResult = await auth.signIn(identifier, {
        ipAddress,
        userAgent,
      })

      if (!signInResult.success) {
        console.error('Sign-in failed:', signInResult.error)
        return NextResponse.redirect(
          new URL('/sign-in?error=signin_failed', config.baseUrl),
        )
      }
    } else {
      const signUpResult = await auth.signUp(
        identifier,
        { name: identifier.data.name },
        {
          ipAddress,
          userAgent,
        },
      )

      if (!signUpResult.success) {
        console.error('Sign-up failed:', signUpResult.error)
        return NextResponse.redirect(
          new URL('/sign-up?error=signup_failed', config.baseUrl),
        )
      }
    }

    // Read and clear the returnTo cookie
    const cookieStore = await cookies()
    const returnToCookie = cookieStore.get('oauth_return_to')?.value
    const validatedReturnTo = validateReturnTo(returnToCookie)
    cookieStore.delete('oauth_return_to')

    return NextResponse.redirect(
      new URL(validatedReturnTo || '/', config.baseUrl),
    )
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/sign-in?error=internal_error', config.baseUrl),
    )
  }
}
