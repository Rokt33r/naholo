import 'server-only'
import { cache } from 'react'
import { db } from '@/db'
import { issues } from '@/db/schema'
import { getAuthUser } from '@/server/auth/utils'
import { eq, and } from 'drizzle-orm'

/**
 * Get a single issue
 */
export const getIssue = cache(async (issueId: string) => {
  const user = await getAuthUser()
  if (!user) return null

  const [issue] = await db
    .select({
      id: issues.id,
      projectId: issues.projectId,
      title: issues.title,
      closed: issues.closed,
      closedAt: issues.closedAt,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
    })
    .from(issues)
    .where(and(eq(issues.id, issueId), eq(issues.userId, user.id)))
    .limit(1)

  return issue || null
})
