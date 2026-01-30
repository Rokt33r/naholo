import 'server-only'
import { cache } from 'react'
import { db } from '@/db'
import { notes } from '@/db/schema'
import { getAuthUser } from '@/server/auth/utils'
import { eq, and, asc } from 'drizzle-orm'

/**
 * List notes for an issue (ordered by position)
 */
export const listNotes = cache(async (issueId: string) => {
  const user = await getAuthUser()
  if (!user) return []

  return await db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      position: notes.position,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(and(eq(notes.issueId, issueId), eq(notes.userId, user.id)))
    .orderBy(asc(notes.position))
})
