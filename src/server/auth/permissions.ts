import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import { auth } from './auth'
import { db } from '../db'
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

export type { ProjectWorker } from '../services/project-worker'

type AuthMethod = 'session' | 'user-api-token'

export interface GetAuthUserOptions {
  allowedAuthMethods?: AuthMethod[]
}

export interface RequireAuthUserOptions extends GetAuthUserOptions {
  redirectUrlOnFail?: string
}

// --- Auth resolution ---

/**
 * Get authenticated user from session only.
 * Returns null if not authenticated.
 */
const getAuthUserBySession = cache(
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

    if (user == null) {
      return null
    }

    return {
      id: user.id,
      name: user.name,
    }
  },
)

/**
 * Get authenticated user from session and/or user API token.
 * Returns null if not authenticated via any allowed method.
 */
export async function getAuthUser(
  options?: GetAuthUserOptions,
): Promise<{ id: string; name: string } | null> {
  const allowedMethods = options?.allowedAuthMethods ?? [
    'session',
    'user-api-token',
  ]

  if (allowedMethods.includes('user-api-token')) {
    const headersList = await headers()
    const authorization = headersList.get('authorization')
    if (authorization?.startsWith('Bearer naholo_user_')) {
      const token = authorization.slice('Bearer '.length)
      const result = await resolveUserByApiToken(token)
      if (result != null) {
        touchUserApiToken(result.tokenId)
        const user = await auth.storage.getUserById(result.userId)
        if (user != null) {
          return { id: user.id, name: user.name }
        }
      }
    }
  }

  if (allowedMethods.includes('session')) {
    return getAuthUserBySession()
  }

  return null
}

/**
 * Requires authentication via allowed methods.
 * If redirectUrlOnFail is set, redirects on failure. Otherwise throws 'Unauthorized'.
 */
export async function requireAuthUser(
  options?: RequireAuthUserOptions,
): Promise<{ id: string; name: string }> {
  const user = await getAuthUser({
    allowedAuthMethods: options?.allowedAuthMethods,
  })

  if (user == null) {
    if (options?.redirectUrlOnFail != null) {
      redirect(options.redirectUrlOnFail)
    }
    throw new Error('Unauthorized')
  }

  return user
}

// --- App-level permissions ---

/**
 * Requires app admin role. Returns 404 if not authenticated or not admin.
 * Uses notFound() to make admin routes invisible to non-admins.
 */
export async function requireAppAdmin(): Promise<{
  id: string
  name: string
}> {
  const user = await getAuthUserBySession()
  if (user == null) {
    notFound()
  }
  const admin = await db.query.adminUsers.findFirst({
    where: (t, { eq }) => eq(t.userId, user.id),
  })
  if (admin == null) {
    notFound()
  }
  return user
}

// --- Project-level permissions ---

/**
 * Requires authentication and project worker membership with admin role.
 * Throws if not authenticated, not a worker, or not admin.
 */
export async function requireAdminProjectWorker(projectSlug: string): Promise<{
  projectWorker: ProjectWorker
  project: { id: string; slug: string }
}> {
  const { projectWorker, project } = await requireProjectWorker(projectSlug)
  if (projectWorker.role !== 'admin') {
    throw new Error('Forbidden')
  }
  return { projectWorker, project }
}

/**
 * Requires authentication and project worker membership.
 * Checks Bearer token first, then falls back to session auth.
 * Throws if not authenticated or not a worker in the project.
 */
export async function requireProjectWorker(projectSlug: string): Promise<{
  projectWorker: ProjectWorker
  project: { id: string; slug: string }
}> {
  // TODO: Handle api token or session first before resolving projectId. It probably better to make require*ByToken and require*BySession accept projectSlug and resolve it internally.
  const project = await db.query.projects.findFirst({
    columns: { id: true, slug: true },
    where: (t, { eq }) => eq(t.slug, projectSlug),
  })
  if (project == null) {
    throw new NotFoundError('Project')
  }

  // Try Bearer token auth first
  const headersList = await headers()
  const authorization = headersList.get('authorization')
  if (authorization?.startsWith('Bearer naholo_user_')) {
    const token = authorization.slice('Bearer '.length)
    const { projectWorker } = await requireProjectWorkerByUserApiToken(
      project.id,
      token,
      headersList,
    )
    return { projectWorker, project }
  }
  if (authorization?.startsWith('Bearer naholo_')) {
    const token = authorization.slice('Bearer '.length)
    const { projectWorker } = await requireProjectWorkerByApiToken(
      project.id,
      token,
    )
    return { projectWorker, project }
  }

  // Fall back to session-based auth
  const { projectWorker } = await requireProjectWorkerBySession(project.id)
  return { projectWorker, project }
}

async function requireProjectWorkerByApiToken(
  projectId: string,
  token: string,
): Promise<{ projectWorker: ProjectWorker }> {
  const result = await resolveProjectWorkerByApiToken(token)

  if (result == null) {
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
  if (result == null) {
    throw new Error('Unauthorized')
  }

  // Update lastUsedAt in the background
  touchUserApiToken(result.tokenId)

  // Check for project worker override header (only for user tokens)
  const overrideWorkerId = headersList.get('x-naholo-project-worker')
  if (overrideWorkerId != null) {
    const worker = await getProjectWorker(overrideWorkerId, projectId)
    if (
      worker == null ||
      (worker.type !== 'bot' && worker.userId !== result.userId)
    ) {
      throw new Error('Forbidden')
    }
    return { projectWorker: worker }
  }

  // Fall back to user's own project worker
  const worker = await resolveProjectWorkerByUserIdAndProjectId(
    result.userId,
    projectId,
  )
  if (worker == null) {
    throw new Error('Forbidden')
  }

  return { projectWorker: worker }
}

async function requireProjectWorkerBySession(
  projectId: string,
): Promise<{ projectWorker: ProjectWorker }> {
  const user = await getAuthUserBySession()
  if (user == null) {
    throw new Error('Unauthorized')
  }

  const worker = await resolveProjectWorkerByUserIdAndProjectId(
    user.id,
    projectId,
  )
  if (worker == null) {
    throw new Error('Forbidden')
  }

  return { projectWorker: worker }
}

// --- Resource-level permissions ---

/**
 * Requires project worker access AND verifies skill set belongs to project.
 */
export async function requireSkillSetAccess(
  projectSlug: string,
  slug: string,
): Promise<{
  projectWorker: ProjectWorker
  project: { id: string; slug: string }
  skillSet: { id: string }
}> {
  const { projectWorker, project } = await requireProjectWorker(projectSlug)

  const skillSet = await db.query.skillSets.findFirst({
    columns: { id: true },
    where: (t, { eq, and }) =>
      and(eq(t.slug, slug), eq(t.projectId, project.id)),
  })

  if (skillSet == null) {
    throw new NotFoundError('SkillSet')
  }

  return { projectWorker, project, skillSet }
}

/**
 * Requires project worker access AND verifies issue belongs to project.
 * Use for routes that operate on issue-level resources (logs, notes, tasks).
 */
export async function requireIssueAccess(
  projectSlug: string,
  issueNumber: number | string,
): Promise<{
  projectWorker: ProjectWorker
  project: { id: string; slug: string }
  issue: { id: string; number: number }
}> {
  const { projectWorker, project } = await requireProjectWorker(projectSlug)

  const parsed = Number(issueNumber)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new NotFoundError('Issue')
  }

  const issue = await db.query.issues.findFirst({
    columns: { id: true, number: true },
    where: (t, { eq, and }) =>
      and(eq(t.number, parsed), eq(t.projectId, project.id)),
  })

  if (issue == null) {
    throw new NotFoundError('Issue')
  }

  return { projectWorker, project, issue }
}

/**
 * Requires issue access AND verifies log belongs to issue.
 */
export async function requireIssueLogAccess(
  projectSlug: string,
  issueNumber: number | string,
  logId: string,
): Promise<{
  projectWorker: ProjectWorker
  project: { id: string; slug: string }
  issue: { id: string; number: number }
  log: { id: string }
}> {
  const { projectWorker, project, issue } = await requireIssueAccess(
    projectSlug,
    issueNumber,
  )

  const log = await db.query.logs.findFirst({
    columns: { id: true },
    where: (t, { eq, and }) => and(eq(t.id, logId), eq(t.issueId, issue.id)),
  })

  if (log == null) {
    throw new NotFoundError('Log')
  }

  return { projectWorker, project, issue, log }
}

/**
 * Requires issue access AND verifies note belongs to issue.
 */
export async function requireIssueNoteAccess(
  projectSlug: string,
  issueNumber: number | string,
  noteName: string,
): Promise<{
  projectWorker: ProjectWorker
  project: { id: string; slug: string }
  issue: { id: string; number: number }
  note: { id: string; name: string }
}> {
  const { projectWorker, project, issue } = await requireIssueAccess(
    projectSlug,
    issueNumber,
  )

  const note = await db.query.notes.findFirst({
    columns: { id: true, name: true },
    where: (t, { eq, and }) =>
      and(eq(t.name, noteName), eq(t.issueId, issue.id)),
  })

  if (note == null) {
    throw new NotFoundError('Note')
  }

  return { projectWorker, project, issue, note }
}

/**
 * Requires issue access AND verifies task belongs to issue.
 */
export async function requireIssueTaskAccess(
  projectSlug: string,
  issueNumber: number | string,
  taskId: string,
): Promise<{
  projectWorker: ProjectWorker
  project: { id: string; slug: string }
  issue: { id: string; number: number }
  task: { id: string }
}> {
  const { projectWorker, project, issue } = await requireIssueAccess(
    projectSlug,
    issueNumber,
  )

  const task = await db.query.tasks.findFirst({
    columns: { id: true },
    where: (t, { eq, and }) => and(eq(t.id, taskId), eq(t.issueId, issue.id)),
  })

  if (task == null) {
    throw new NotFoundError('Task')
  }

  return { projectWorker, project, issue, task }
}
