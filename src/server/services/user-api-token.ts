import 'server-only'
import { randomBytes, createHash } from 'crypto'
import { db } from '../db'
import { userApiTokens } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import type { SuccessResult, ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'

export type UserApiToken = {
  id: string
  name: string
  tokenHint: string
  lastUsedAt: Date | null
  createdAt: Date
}

const USER_TOKEN_PREFIX = 'naholo_user_'

function generateUserToken(): string {
  return USER_TOKEN_PREFIX + randomBytes(20).toString('hex')
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Create a new user API token.
 * Returns the plaintext token — it cannot be retrieved again.
 */
export async function createUserApiToken(
  userId: string,
  data: { name: string },
): Promise<SuccessResult<{ id: string; token: string; tokenHint: string }>> {
  const token = generateUserToken()
  const tokenHash = hashToken(token)
  const tokenHint = token.slice(0, 8 + USER_TOKEN_PREFIX.length) + '...'

  const [row] = await db
    .insert(userApiTokens)
    .values({
      userId,
      name: data.name,
      tokenHash,
      tokenHint,
    })
    .returning({ id: userApiTokens.id })

  return ok({ id: row.id, token, tokenHint })
}

/**
 * Resolve a user by API token.
 * Returns the userId and tokenId, or null if not found.
 */
export async function resolveUserByApiToken(
  token: string,
): Promise<{ userId: string; tokenId: string } | null> {
  const tokenHash = hashToken(token)

  const result = await db.query.userApiTokens.findFirst({
    where: (t, { eq }) => eq(t.tokenHash, tokenHash),
  })

  if (!result) {
    return null
  }

  return { userId: result.userId, tokenId: result.id }
}

/**
 * Update lastUsedAt for a user API token (fire-and-forget).
 */
export async function touchUserApiToken(tokenId: string): Promise<void> {
  await db
    .update(userApiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(userApiTokens.id, tokenId))
    .then(() => {})
}

/**
 * List API tokens for a user (without token hashes).
 */
export async function listUserApiTokens(
  userId: string,
): Promise<UserApiToken[]> {
  return db.query.userApiTokens.findMany({
    columns: {
      id: true,
      name: true,
      tokenHint: true,
      lastUsedAt: true,
      createdAt: true,
    },
    where: (t, { eq }) => eq(t.userId, userId),
  })
}

/**
 * Revoke (delete) a user API token.
 */
export async function revokeUserApiToken(
  tokenId: string,
): Promise<ReturnResult<undefined>> {
  const [deleted] = await db
    .delete(userApiTokens)
    .where(and(eq(userApiTokens.id, tokenId)))
    .returning({ id: userApiTokens.id })

  if (!deleted) {
    return err(new NotFoundError('API token'))
  }

  return ok()
}
