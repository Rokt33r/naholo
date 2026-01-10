import 'server-only'
import { cache } from 'react'
import { db } from '@/db'
import { tasks } from '@/db/schema'
import { getAuthUser } from '@/server/auth/utils'
import { eq, and, asc } from 'drizzle-orm'

/**
 * List tasks for an issue (hierarchical)
 */
export const listTasks = cache(async (issueId: string) => {
  const user = await getAuthUser()
  if (!user) return []

  return await db
    .select({
      id: tasks.id,
      parentTaskId: tasks.parentTaskId,
      content: tasks.content,
      done: tasks.done,
      position: tasks.position,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(and(eq(tasks.issueId, issueId), eq(tasks.userId, user.id)))
    .orderBy(asc(tasks.position))
})
