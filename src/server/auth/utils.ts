import { headers } from 'next/headers'
import { auth } from './auth'

export async function getRequestMetadata(): Promise<{
  ipAddress?: string
  userAgent?: string
}> {
  try {
    const headersList = await headers()

    // Extract IP address - customize based on hosting provider
    // Vercel/Netlify: x-real-ip
    // Cloudflare: cf-connecting-ip
    const ipAddress = headersList.get('x-real-ip') || undefined

    // Extract user agent
    const userAgent = headersList.get('user-agent') || undefined

    return { ipAddress, userAgent }
  } catch (error) {
    console.warn('Failed to extract request metadata:', error)
    return { ipAddress: undefined, userAgent: undefined }
  }
}

/**
 * Get authenticated user (for use in server components or server actions)
 * Returns null if not authenticated
 */
export async function getAuthUser(): Promise<{
  id: string
  name: string
} | null> {
  const result = await auth.verifySession()

  if (!result.success) {
    return null
  }

  const session = result.data
  const user = await auth.storage.getUserById(session.userId)

  if (!user) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
  }
}
