import 'server-only'
import { cache } from 'react'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { getAuthUser } from '@/server/auth/utils'
import { eq, desc } from 'drizzle-orm'

export const listProjects = cache(async () => {
  const user = await getAuthUser()
  if (!user) return []

  return await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt))
})
