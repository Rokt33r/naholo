/**
 * Validate a returnTo path to prevent open redirect attacks.
 * Returns the sanitized path or null if invalid.
 */
export function validateReturnTo(
  returnTo: string | null | undefined,
): string | null {
  if (!returnTo) {
    return null
  }

  // Must be a relative path starting with /
  if (!returnTo.startsWith('/')) {
    return null
  }

  // Block protocol-relative URLs (//example.com)
  if (returnTo.startsWith('//')) {
    return null
  }

  // Block backslash normalization attacks
  if (returnTo.includes('\\')) {
    return null
  }

  return returnTo
}
