import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { auth } from './auth'
import { db } from '../db'
import { cache } from 'react'
import {
  resolveProjectWorkerByApiToken,
  touchProjectWorkerApiToken,
} from '../services/project-worker-api-token'
import {
  resolveProjectWorkerByUserIdAndProjectId,
  type ProjectWorker,
} from '../services/project-worker'

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

/**
 * Requires authentication and project worker membership with admin role.
 * Throws if not authenticated, not a worker, or not admin.
 */
export async function requireAdminProjectWorker(
  projectId: string,
): Promise<{ projectWorker: ProjectWorker }> {
  const { projectWorker } = await requireProjectWorker(projectId)
  if (projectWorker.role !== 'admin') {
    throw new Error('Forbidden')
  }
  return { projectWorker }
}

/**
 * Requires authentication and project worker membership.
 * Checks Bearer token first, then falls back to session auth.
 * Throws if not authenticated or not a worker in the project.
 */
export async function requireProjectWorker(
  projectId: string,
): Promise<{ projectWorker: ProjectWorker }> {
  // Try Bearer token auth first
  const headersList = await headers()
  const authorization = headersList.get('authorization')
  if (authorization?.startsWith('Bearer naholo_')) {
    const token = authorization.slice('Bearer '.length)
    return requireProjectWorkerByApiToken(projectId, token)
  }

  // Fall back to session-based auth
  return requireProjectWorkerBySession(projectId)
}

async function requireProjectWorkerByApiToken(
  projectId: string,
  token: string,
): Promise<{ projectWorker: ProjectWorker }> {
  const result = await resolveProjectWorkerByApiToken(token)

  if (!result) {
    throw new Error('Unauthorized')
  }
  if (result.projectWorker.projectId !== projectId) {
    throw new Error('Forbidden')
  }

  // Update lastUsedAt in the background
  touchProjectWorkerApiToken(result.tokenId)

  return { projectWorker: result.projectWorker }
}

async function requireProjectWorkerBySession(
  projectId: string,
): Promise<{ projectWorker: ProjectWorker }> {
  const user = await getAuthUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const worker = await resolveProjectWorkerByUserIdAndProjectId(
    user.id,
    projectId,
  )
  if (!worker) {
    throw new Error('Forbidden')
  }

  return { projectWorker: worker }
}
