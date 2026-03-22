import 'server-only'
import { randomBytes, createHash } from 'crypto'
import { db } from '../db'
import { projectWorkerApiTokens } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import type { SuccessResult, ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'
import type { ProjectWorker } from './project-worker'

export type ApiToken = {
  id: string
  name: string
  tokenHint: string
  lastUsedAt: Date | null
  createdAt: Date
}

export type CreateApiTokenInput = {
  name: string
}

const TOKEN_PREFIX = 'naholo_'

function generateToken(): string {
  return TOKEN_PREFIX + randomBytes(20).toString('hex')
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Create a new API token for a project worker.
 * Returns the plaintext token — it cannot be retrieved again.
 */
export async function createProjectWorkerApiToken(
  projectWorkerId: string,
  data: CreateApiTokenInput,
): Promise<SuccessResult<{ id: string; token: string }>> {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const tokenHint = token.slice(0, 8 + TOKEN_PREFIX.length) + '...'

  const [row] = await db
    .insert(projectWorkerApiTokens)
    .values({
      projectWorkerId,
      name: data.name,
      tokenHash,
      tokenHint,
    })
    .returning({ id: projectWorkerApiTokens.id })

  return ok({ id: row.id, token })
}

/**
 * List API tokens for a project worker (without token hashes).
 */
export async function listProjectWorkerApiTokens(
  projectWorkerId: string,
): Promise<ApiToken[]> {
  return db.query.projectWorkerApiTokens.findMany({
    columns: {
      id: true,
      name: true,
      tokenHint: true,
      lastUsedAt: true,
      createdAt: true,
    },
    where: (t, { eq }) => eq(t.projectWorkerId, projectWorkerId),
  })
}

/**
 * Revoke (delete) an API token.
 */
export async function revokeProjectWorkerApiToken(
  projectWorkerId: string,
  tokenId: string,
): Promise<ReturnResult<undefined>> {
  const [deleted] = await db
    .delete(projectWorkerApiTokens)
    .where(
      and(
        eq(projectWorkerApiTokens.id, tokenId),
        eq(projectWorkerApiTokens.projectWorkerId, projectWorkerId),
      ),
    )
    .returning({ id: projectWorkerApiTokens.id })

  if (!deleted) {
    return err(new NotFoundError('API token'))
  }

  return ok()
}

/**
 * Resolve a project worker by API token.
 * Returns the worker and token ID, or null if not found.
 */
export async function resolveProjectWorkerByApiToken(
  token: string,
): Promise<{ projectWorker: ProjectWorker; tokenId: string } | null> {
  const tokenHash = hashToken(token)

  const result = await db.query.projectWorkerApiTokens.findFirst({
    where: (t, { eq }) => eq(t.tokenHash, tokenHash),
    with: { projectWorker: true },
  })

  if (!result) {
    return null
  }

  return { projectWorker: result.projectWorker, tokenId: result.id }
}

/**
 * Update lastUsedAt for an API token (fire-and-forget).
 */
export async function touchProjectWorkerApiToken(
  tokenId: string,
): Promise<void> {
  await db
    .update(projectWorkerApiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(projectWorkerApiTokens.id, tokenId))
    .then(() => {})
}
