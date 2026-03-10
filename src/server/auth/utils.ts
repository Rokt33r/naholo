import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { auth } from './auth'
import { db } from '../db'
import { cache } from 'react'

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
export const getAuthUser = cache(
  async (): Promise<{
    id: string
    name: string
  } | null> => {
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
  },
)

/**
 * Requires authentication, redirects to sign-in if not authenticated.
 * Use in server components at the top of the render function.
 */
export async function requireAuthOrRedirect(): Promise<{
  id: string
  name: string
}> {
  const user = await getAuthUser()
  if (!user) {
    redirect('/sign-in')
  }
  return user
}

/**
 * Requires admin role, returns 404 if not authenticated or not admin.
 * Use in admin pages/API routes to make them invisible to non-admins.
 */
export async function requireAdminOrNotFound(): Promise<{
  id: string
  name: string
}> {
  const user = await getAuthUser()
  if (!user) {
    notFound()
  }
  const admin = await db.query.adminUsers.findFirst({
    where: (t, { eq }) => eq(t.userId, user.id),
  })
  if (!admin) {
    notFound()
  }
  return user
}
