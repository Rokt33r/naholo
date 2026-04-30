import 'server-only'
import { randomBytes, createHash } from 'crypto'
import { db } from '../db'
import { projectOperatorApiTokens } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import type { SuccessResult, ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from '../errors'
import type { ProjectOperator } from './project-operator'

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
 * Create a new API token for a project operator.
 * Returns the plaintext token — it cannot be retrieved again.
 */
export async function createProjectOperatorApiToken(
  projectOperatorId: string,
  data: CreateApiTokenInput,
): Promise<SuccessResult<{ id: string; token: string }>> {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const tokenHint = token.slice(0, 8 + TOKEN_PREFIX.length) + '...'

  const [row] = await db
    .insert(projectOperatorApiTokens)
    .values({
      projectOperatorId,
      name: data.name,
      tokenHash,
      tokenHint,
    })
    .returning({ id: projectOperatorApiTokens.id })

  return ok({ id: row.id, token })
}

/**
 * List API tokens for a project operator (without token hashes).
 */
export async function listProjectOperatorApiTokens(
  projectOperatorId: string,
): Promise<ApiToken[]> {
  return db.query.projectOperatorApiTokens.findMany({
    columns: {
      id: true,
      name: true,
      tokenHint: true,
      lastUsedAt: true,
      createdAt: true,
    },
    where: (t, { eq }) => eq(t.projectOperatorId, projectOperatorId),
  })
}

/**
 * Revoke (delete) an API token.
 */
export async function revokeProjectOperatorApiToken(
  projectOperatorId: string,
  tokenId: string,
): Promise<ReturnResult<undefined>> {
  const [deleted] = await db
    .delete(projectOperatorApiTokens)
    .where(
      and(
        eq(projectOperatorApiTokens.id, tokenId),
        eq(projectOperatorApiTokens.projectOperatorId, projectOperatorId),
      ),
    )
    .returning({ id: projectOperatorApiTokens.id })

  if (!deleted) {
    return err(new NotFoundError('API token'))
  }

  return ok()
}

/**
 * Resolve a project operator by API token.
 * Returns the operator and token ID, or null if not found.
 */
export async function resolveProjectOperatorByApiToken(
  token: string,
): Promise<{ projectOperator: ProjectOperator; tokenId: string } | null> {
  const tokenHash = hashToken(token)

  const result = await db.query.projectOperatorApiTokens.findFirst({
    where: (t, { eq }) => eq(t.tokenHash, tokenHash),
    with: { projectOperator: true },
  })

  if (!result) {
    return null
  }

  return { projectOperator: result.projectOperator, tokenId: result.id }
}

/**
 * Update lastUsedAt for an API token (fire-and-forget).
 */
export async function touchProjectOperatorApiToken(
  tokenId: string,
): Promise<void> {
  await db
    .update(projectOperatorApiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(projectOperatorApiTokens.id, tokenId))
    .then(() => {})
}
