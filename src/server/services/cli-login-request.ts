import 'server-only'
import { randomBytes } from 'crypto'
import { db } from '../db'
import { cliLoginRequests } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { SuccessResult } from '@/lib/return-result'
import { ok } from '@/lib/return-result'
import { generateReadableWords } from '@/lib/auth/cli-words'

const REQUEST_TTL_MS = 10 * 60 * 1000 // 10 minutes
const CODE_TTL_MS = 60 * 1000 // 60 seconds

/**
 * Create a CLI login request.
 * Validates callbackUrl is localhost, generates verification words.
 */
export async function createCliLoginRequest(
  state: string,
  callbackUrl: string,
  ipAddress: string,
): Promise<SuccessResult<{ requestId: string; words: string }>> {
  const words = generateReadableWords()
  const expiresAt = new Date(Date.now() + REQUEST_TTL_MS)

  const [row] = await db
    .insert(cliLoginRequests)
    .values({
      state,
      words,
      callbackUrl,
      ipAddress,
      expiresAt,
    })
    .returning({ id: cliLoginRequests.id })

  return ok({ requestId: row.id, words })
}

export type CliLoginRequest = {
  id: string
  state: string
  words: string
  code: string | null
  codeExpiresAt: Date | null
  userId: string | null
  callbackUrl: string
  ipAddress: string
  consumedAt: Date | null
  expiresAt: Date
  createdAt: Date
}

/**
 * Get a CLI login request by id. Returns null if not found.
 */
export async function getCliLoginRequestById(
  requestId: string,
): Promise<CliLoginRequest | null> {
  const result = await db.query.cliLoginRequests.findFirst({
    where: (t, { eq }) => eq(t.id, requestId),
  })

  return result ?? null
}

/** Whether the request is pending (not expired, not yet issued a code). */
export function isCliLoginRequestPending(request: CliLoginRequest): boolean {
  return request.expiresAt > new Date() && request.code === null
}

/** Whether the request can be consumed (code issued, not expired, not yet consumed). */
export function isCliLoginRequestConsumable(request: CliLoginRequest): boolean {
  return (
    request.code !== null &&
    request.codeExpiresAt !== null &&
    request.codeExpiresAt > new Date() &&
    request.consumedAt === null
  )
}

/**
 * Issue an authorization code for a CLI login request.
 */
export async function issueCliLoginRequestCode(
  requestId: string,
  userId: string,
): Promise<SuccessResult<{ code: string; callbackUrl: string }>> {
  const code = randomBytes(32).toString('hex')
  const codeExpiresAt = new Date(Date.now() + CODE_TTL_MS)

  const [row] = await db
    .update(cliLoginRequests)
    .set({ code, codeExpiresAt, userId })
    .where(eq(cliLoginRequests.id, requestId))
    .returning({ callbackUrl: cliLoginRequests.callbackUrl })

  return ok({ code, callbackUrl: row.callbackUrl })
}

/**
 * Mark a CLI login request as consumed.
 */
export async function markCliLoginRequestConsumed(
  requestId: string,
): Promise<void> {
  await db
    .update(cliLoginRequests)
    .set({ consumedAt: new Date() })
    .where(eq(cliLoginRequests.id, requestId))
}
