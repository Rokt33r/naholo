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
  getProjectWorker,
  type ProjectWorker,
} from '../services/project-worker'
import {
  resolveUserByApiToken,
  touchUserApiToken,
} from '../services/user-api-token'
import { NotFoundError } from '../services/errors'

export async function getRequestMetadata(): Promise<{
  ipAddress?: string
  userAgent?: string
}> {
  try {
    const headersList = await headers()

    // Extract IP address - customize based on hosting provider
    // Vercel/Netlify: x-real-ip
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
 * Requires authentication via Bearer user API token or session.
 * Use in API routes that need to support both CLI and browser access.
 * Throws 'Unauthorized' if neither is valid.
 */
export async function requireAuthUser(): Promise<{ id: string; name: string }> {
  const headersList = await headers()
  const authorization = headersList.get('authorization')
  if (authorization?.startsWith('Bearer naholo_user_')) {
    const token = authorization.slice('Bearer '.length)
    const result = await resolveUserByApiToken(token)
    if (result == null) {
      throw new Error('Unauthorized')
    }
    touchUserApiToken(result.tokenId)
    const user = await auth.storage.getUserById(result.userId)
    if (user == null) {
      throw new Error('Unauthorized')
    }
    return { id: user.id, name: user.name }
  }

  const user = await getAuthUser()
  if (user == null) {
    throw new Error('Unauthorized')
  }
  return user
}

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
  if (authorization?.startsWith('Bearer naholo_user_')) {
    const token = authorization.slice('Bearer '.length)
    return requireProjectWorkerByUserApiToken(projectId, token, headersList)
  }
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

async function requireProjectWorkerByUserApiToken(
  projectId: string,
  token: string,
  headersList: Headers,
): Promise<{ projectWorker: ProjectWorker }> {
  const result = await resolveUserByApiToken(token)
  if (!result) {
    throw new Error('Unauthorized')
  }

  // Update lastUsedAt in the background
  touchUserApiToken(result.tokenId)

  // Check for project worker override header (only for user tokens)
  const overrideWorkerId = headersList.get('x-naholo-project-worker')
  if (overrideWorkerId) {
    const worker = await getProjectWorker(overrideWorkerId, projectId)
    if (!worker || worker.type !== 'bot') {
      throw new Error('Forbidden')
    }
    return { projectWorker: worker }
  }

  // Fall back to user's own project worker
  const worker = await resolveProjectWorkerByUserIdAndProjectId(
    result.userId,
    projectId,
  )
  if (!worker) {
    throw new Error('Forbidden')
  }

  return { projectWorker: worker }
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

/**
 * Requires project worker access AND verifies issue belongs to project.
 * Use for routes that operate on issue-level resources (logs, notes, tasks).
 */
export async function requireIssueAccess(
  projectId: string,
  issueId: string,
): Promise<{ projectWorker: ProjectWorker; issue: { id: string } }> {
  const { projectWorker } = await requireProjectWorker(projectId)

  const issue = await db.query.issues.findFirst({
    columns: { id: true },
    where: (t, { eq, and }) =>
      and(eq(t.id, issueId), eq(t.projectId, projectId)),
  })

  if (!issue) {
    throw new NotFoundError('Issue')
  }

  return { projectWorker, issue }
}

/**
 * Requires issue access AND verifies log belongs to issue.
 */
export async function requireIssueLogAccess(
  projectId: string,
  issueId: string,
  logId: string,
): Promise<{
  projectWorker: ProjectWorker
  issue: { id: string }
  log: { id: string }
}> {
  const { projectWorker, issue } = await requireIssueAccess(projectId, issueId)

  const log = await db.query.logs.findFirst({
    columns: { id: true },
    where: (t, { eq, and }) => and(eq(t.id, logId), eq(t.issueId, issueId)),
  })

  if (!log) {
    throw new NotFoundError('Log')
  }

  return { projectWorker, issue, log }
}

/**
 * Requires issue access AND verifies note belongs to issue.
 */
export async function requireIssueNoteAccess(
  projectId: string,
  issueId: string,
  noteId: string,
): Promise<{
  projectWorker: ProjectWorker
  issue: { id: string }
  note: { id: string }
}> {
  const { projectWorker, issue } = await requireIssueAccess(projectId, issueId)

  const note = await db.query.notes.findFirst({
    columns: { id: true },
    where: (t, { eq, and }) => and(eq(t.id, noteId), eq(t.issueId, issueId)),
  })

  if (!note) {
    throw new NotFoundError('Note')
  }

  return { projectWorker, issue, note }
}

/**
 * Requires issue access AND verifies task belongs to issue.
 */
export async function requireIssueTaskAccess(
  projectId: string,
  issueId: string,
  taskId: string,
): Promise<{
  projectWorker: ProjectWorker
  issue: { id: string }
  task: { id: string }
}> {
  const { projectWorker, issue } = await requireIssueAccess(projectId, issueId)

  const task = await db.query.tasks.findFirst({
    columns: { id: true },
    where: (t, { eq, and }) => and(eq(t.id, taskId), eq(t.issueId, issueId)),
  })

  if (!task) {
    throw new NotFoundError('Task')
  }

  return { projectWorker, issue, task }
}
