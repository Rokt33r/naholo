import 'server-only'
import { db } from '../db'

/**
 * Resolve a user's primary email from their identifiers.
 * Prefers the email-otp identifier value, falls back to the
 * google-oauth identifier's email metadata.
 */
export async function getUserPrimaryEmail(
  userId: string,
): Promise<string | null> {
  const identifiers = await db.query.userIdentifiers.findMany({
    columns: { type: true, value: true, data: true },
    where: (t, { eq }) => eq(t.userId, userId),
  })

  const emailOtp = identifiers.find(
    (identifier) => identifier.type === 'email-otp',
  )
  if (emailOtp != null) {
    return emailOtp.value
  }

  const googleOauth = identifiers.find(
    (identifier) => identifier.type === 'google-oauth',
  )
  if (googleOauth != null) {
    const email = extractGoogleEmail(googleOauth.data)
    if (email != null) {
      return email
    }
    return googleOauth.value
  }

  return null
}

function extractGoogleEmail(data: unknown): string | null {
  if (
    typeof data === 'object' &&
    data != null &&
    'email' in data &&
    typeof (data as { email: unknown }).email === 'string'
  ) {
    return (data as { email: string }).email
  }
  return null
}
