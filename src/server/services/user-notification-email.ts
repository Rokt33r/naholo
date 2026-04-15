import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { userNotificationEmails } from '../db/schema'

/**
 * Get the notification email for a user.
 */
export async function getUserNotificationEmail(
  userId: string,
): Promise<string | null> {
  const result = await db.query.userNotificationEmails.findFirst({
    columns: { email: true },
    where: (t, { eq }) => eq(t.userId, userId),
  })

  return result?.email ?? null
}

/**
 * Set (upsert) the notification email for a user.
 */
export async function setUserNotificationEmail(
  userId: string,
  email: string,
): Promise<void> {
  await db
    .insert(userNotificationEmails)
    .values({ userId, email })
    .onConflictDoUpdate({
      target: userNotificationEmails.userId,
      set: { email, updatedAt: new Date() },
    })
}
