import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../server/auth/auth'
import { googleOAuthAuthenticator } from '../../../../../server/auth/authenticators/google'
import { getRequestMetadata } from '../../../../../server/auth/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/sign-in?error=missing_parameters', request.url),
    )
  }

  try {
    const result = await googleOAuthAuthenticator.verifyCallback(code, state)

    if (!result.success) {
      console.error('Google OAuth verification failed:', result.error)
      return NextResponse.redirect(
        new URL('/sign-in?error=oauth_verification_failed', request.url),
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
          new URL('/sign-in?error=signin_failed', request.url),
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
          new URL('/sign-up?error=signup_failed', request.url),
        )
      }
    }

    return NextResponse.redirect(new URL('/', request.url))
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/sign-in?error=internal_error', request.url),
    )
  }
}
