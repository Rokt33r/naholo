import 'server-only'
import { cache } from 'react'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { getAuthUser } from '@/server/auth/utils'
import { eq, and } from 'drizzle-orm'

/**
 * Get a single project
 */
export const getProject = cache(async (projectId: string) => {
  const user = await getAuthUser()
  if (!user) return null

  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1)

  return project || null
})
