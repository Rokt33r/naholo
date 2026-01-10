import 'server-only'
import { cache } from 'react'
import { db } from '@/db'
import { logs } from '@/db/schema'
import { getAuthUser } from '@/server/auth/utils'
import { eq, and, asc } from 'drizzle-orm'

/**
 * List logs for an issue
 */
export const listLogs = cache(async (issueId: string) => {
  const user = await getAuthUser()
  if (!user) return []

  return await db
    .select({
      id: logs.id,
      content: logs.content,
      createdAt: logs.createdAt,
      updatedAt: logs.updatedAt,
    })
    .from(logs)
    .where(and(eq(logs.issueId, issueId), eq(logs.userId, user.id)))
    .orderBy(asc(logs.createdAt))
})
