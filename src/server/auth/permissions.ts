import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import { auth } from './auth'
import { db } from '../db'
import {
  resolveProjectOperatorByApiToken,
  touchProjectOperatorApiToken,
} from '../services/project-operator-api-token'
import {
  resolveProjectOperatorByUserIdAndProjectId,
  type ProjectOperator,
} from '../services/project-operator'
import {
  resolveUserByApiToken,
  touchUserApiToken,
} from '../services/user-api-token'
import { config } from '../config'
import { NotFoundError, SubscriptionNotReadyError } from '../errors'
import {
  isActiveSubscriptionStatus,
  type SubscriptionStatus,
} from '../services/project-subscription'

export type { ProjectOperator } from '../services/project-operator'

export type RequireProjectOperatorOptions = {
  skipSubscriptionCheck?: boolean
}

export type ProjectOperatorContext = {
  projectOperator: ProjectOperator
  project: { id: string; slug: string }
}

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
 * Requires authentication and project operator membership with admin role.
 * Throws if not authenticated, not an operator, or not admin.
 */
export async function requireAdminProjectOperator(
  projectSlug: string,
  options?: RequireProjectOperatorOptions,
): Promise<ProjectOperatorContext> {
  const { projectOperator, project } = await requireProjectOperator(
    projectSlug,
    options,
  )
  if (projectOperator.role !== 'admin') {
    throw new Error('Forbidden')
  }
  return { projectOperator, project }
}

/**
 * Requires authentication and project operator membership.
 * Checks Bearer token first, then falls back to session auth.
 * Throws if not authenticated or not an operator in the project.
 */
export async function requireProjectOperator(
  projectSlug: string,
  options?: RequireProjectOperatorOptions,
): Promise<ProjectOperatorContext> {
  // TODO: Handle api token or session first before resolving projectId. It probably better to make require*ByToken and require*BySession accept projectSlug and resolve it internally.
  const projectRow = await db.query.projects.findFirst({
    columns: { id: true, slug: true },
    with: {
      activeProjectSubscription: {
        with: { paddleSubscription: { columns: { status: true } } },
      },
    },
    where: (t, { eq }) => eq(t.slug, projectSlug),
  })
  if (projectRow == null) {
    throw new NotFoundError('Project')
  }

  const project = { id: projectRow.id, slug: projectRow.slug }

  const { projectOperator } = await resolveProjectOperator(project.id)

  if (config.billing && options?.skipSubscriptionCheck !== true) {
    const projectSubscriptionStatus =
      projectRow.activeProjectSubscription?.paddleSubscription?.status ?? null
    const subscription =
      projectSubscriptionStatus == null
        ? null
        : { status: projectSubscriptionStatus as SubscriptionStatus }
    if (
      subscription == null ||
      !isActiveSubscriptionStatus(subscription.status)
    ) {
      throw new SubscriptionNotReadyError()
    }
  }

  return { projectOperator, project }
}

type ResolvedProjectOperator = {
  projectOperator: ProjectOperator
}

async function resolveProjectOperator(
  projectId: string,
): Promise<ResolvedProjectOperator> {
  const headersList = await headers()
  const authorization = headersList.get('authorization')
  if (authorization?.startsWith('Bearer naholo_user_')) {
    const token = authorization.slice('Bearer '.length)
    return requireProjectOperatorByUserApiToken(projectId, token)
  }
  if (authorization?.startsWith('Bearer naholo_')) {
    const token = authorization.slice('Bearer '.length)
    return requireProjectOperatorByApiToken(projectId, token)
  }
  return requireProjectOperatorBySession(projectId)
}

async function requireProjectOperatorByApiToken(
  projectId: string,
  token: string,
): Promise<ResolvedProjectOperator> {
  const result = await resolveProjectOperatorByApiToken(token)

  if (result == null) {
    throw new Error('Unauthorized')
  }
  if (result.projectOperator.projectId !== projectId) {
    throw new Error('Forbidden')
  }

  // Update lastUsedAt in the background
  touchProjectOperatorApiToken(result.tokenId)

  return { projectOperator: result.projectOperator }
}

async function requireProjectOperatorByUserApiToken(
  projectId: string,
  token: string,
): Promise<ResolvedProjectOperator> {
  const result = await resolveUserByApiToken(token)
  if (result == null) {
    throw new Error('Unauthorized')
  }

  // Update lastUsedAt in the background
  touchUserApiToken(result.tokenId)

  const projectOperator = await resolveProjectOperatorByUserIdAndProjectId(
    result.userId,
    projectId,
  )
  if (projectOperator == null) {
    throw new Error('Forbidden')
  }

  return { projectOperator }
}

async function requireProjectOperatorBySession(
  projectId: string,
): Promise<ResolvedProjectOperator> {
  const user = await getAuthUserBySession()
  if (user == null) {
    throw new Error('Unauthorized')
  }

  const operator = await resolveProjectOperatorByUserIdAndProjectId(
    user.id,
    projectId,
  )
  if (operator == null) {
    throw new Error('Forbidden')
  }

  return { projectOperator: operator }
}

// --- Resource-level permissions ---

/**
 * Requires project operator access AND verifies operation belongs to project.
 * Use for routes that operate on operation-level resources (logs, notes, objectives).
 */
export async function requireOperationAccess(
  projectSlug: string,
  operationNumber: number | string,
  options?: RequireProjectOperatorOptions,
): Promise<
  ProjectOperatorContext & {
    operation: { id: string; number: number }
  }
> {
  const { projectOperator, project } = await requireProjectOperator(
    projectSlug,
    options,
  )

  const parsed = Number(operationNumber)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new NotFoundError('Operation')
  }

  const operation = await db.query.operations.findFirst({
    columns: { id: true, number: true },
    where: (t, { eq, and }) =>
      and(eq(t.number, parsed), eq(t.projectId, project.id)),
  })

  if (operation == null) {
    throw new NotFoundError('Operation')
  }

  return { projectOperator, project, operation }
}

/**
 * Requires operation access AND verifies operation log belongs to operation.
 */
export async function requireOperationLogAccess(
  projectSlug: string,
  operationNumber: number | string,
  logId: string,
  options?: RequireProjectOperatorOptions,
): Promise<
  ProjectOperatorContext & {
    operation: { id: string; number: number }
    log: { id: string }
  }
> {
  const { projectOperator, project, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
    options,
  )

  const log = await db.query.operationLogs.findFirst({
    columns: { id: true },
    where: (t, { eq, and }) =>
      and(eq(t.id, logId), eq(t.operationId, operation.id)),
  })

  if (log == null) {
    throw new NotFoundError('OperationLog')
  }

  return { projectOperator, project, operation, log }
}

/**
 * Requires operation access AND verifies note belongs to operation.
 */
export async function requireOperationNoteAccess(
  projectSlug: string,
  operationNumber: number | string,
  noteName: string,
  options?: RequireProjectOperatorOptions,
): Promise<
  ProjectOperatorContext & {
    operation: { id: string; number: number }
    note: { id: string; name: string }
  }
> {
  const { projectOperator, project, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
    options,
  )

  const note = await db.query.operationNotes.findFirst({
    columns: { id: true, name: true },
    where: (t, { eq, and }) =>
      and(eq(t.name, noteName), eq(t.operationId, operation.id)),
  })

  if (note == null) {
    throw new NotFoundError('Note')
  }

  return { projectOperator, project, operation, note }
}

/**
 * Requires operation access AND verifies objective belongs to operation.
 */
export async function requireOperationObjectiveAccess(
  projectSlug: string,
  operationNumber: number | string,
  objectiveId: string,
  options?: RequireProjectOperatorOptions,
): Promise<
  ProjectOperatorContext & {
    operation: { id: string; number: number }
    objective: { id: string }
  }
> {
  const { projectOperator, project, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
    options,
  )

  const objective = await db.query.operationObjectives.findFirst({
    columns: { id: true },
    where: (t, { eq, and }) =>
      and(eq(t.id, objectiveId), eq(t.operationId, operation.id)),
  })

  if (objective == null) {
    throw new NotFoundError('Objective')
  }

  return {
    projectOperator,
    project,
    operation,
    objective,
  }
}
