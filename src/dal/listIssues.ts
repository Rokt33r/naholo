import 'server-only'
import { cache } from 'react'
import { db } from '@/db'
import { issues, tasks } from '@/db/schema'
import { getAuthUser } from '@/server/auth/utils'
import { eq, and, desc, count, sum, sql } from 'drizzle-orm'

/**
 * List issues for a project
 * @param closed - true to show closed, false to show open
 */
export const listIssues = cache(
  async (projectId: string, closed: boolean = false) => {
    const user = await getAuthUser()
    if (!user) return []

    return await db
      .select({
        id: issues.id,
        title: issues.title,
        lastLogPreview: issues.lastLogPreview,
        closed: issues.closed,
        closedAt: issues.closedAt,
        createdAt: issues.createdAt,
        updatedAt: issues.updatedAt,
        totalTasks: count(tasks.id).as('total_tasks'),
        completedTasks: sum(sql`CASE WHEN ${tasks.done} THEN 1 ELSE 0 END`).as(
          'completed_tasks',
        ),
      })
      .from(issues)
      .leftJoin(tasks, eq(tasks.issueId, issues.id))
      .where(
        and(
          eq(issues.projectId, projectId),
          eq(issues.userId, user.id),
          eq(issues.closed, closed),
        ),
      )
      .groupBy(issues.id)
      .orderBy(desc(issues.updatedAt))
  },
)
