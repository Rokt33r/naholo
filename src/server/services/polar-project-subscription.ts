import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { projects, projectSubscriptions } from '../db/schema'
import type { PolarSubscriptionRow } from './polar-subscription'
import { parseProjectSubscriptionMetadata } from '../billing/project-subscription-metadata'

export type ClaimPolarProjectSubscriptionResult =
  | {
      claimed: true
      projectSubscriptionId: string
    }
  | {
      claimed: false
      reason: 'no-metadata' | 'malformed' | 'unknown-project'
    }

export async function claimPolarProjectSubscriptionFromEvent(input: {
  polarSubscriptionRow: PolarSubscriptionRow
  metadata: unknown
}): Promise<ClaimPolarProjectSubscriptionResult> {
  const { polarSubscriptionRow, metadata } = input

  const parsed = parseProjectSubscriptionMetadata(metadata)
  if (!parsed.ok) {
    return { claimed: false, reason: parsed.reason }
  }
  const { projectId } = parsed.data

  const project = await db.query.projects.findFirst({
    columns: { id: true },
    where: (t, { eq }) => eq(t.id, projectId),
  })
  // Unprocessable: metadata references a project that does not exist.
  // Should be rare — surface for monitoring rather than silently dropping.
  if (project == null) {
    return { claimed: false, reason: 'unknown-project' }
  }

  const existingProjectSubscription =
    await db.query.projectSubscriptions.findFirst({
      columns: { id: true },
      where: (t, { eq }) => eq(t.projectId, projectId),
    })

  let projectSubscriptionId: string
  if (existingProjectSubscription == null) {
    const [inserted] = await db
      .insert(projectSubscriptions)
      .values({
        projectId,
        polarSubscriptionId: polarSubscriptionRow.id,
      })
      .returning({ id: projectSubscriptions.id })
    if (inserted == null) {
      throw new Error(
        'claimPolarProjectSubscriptionFromEvent: insert returned no row',
      )
    }
    projectSubscriptionId = inserted.id
  } else {
    await db
      .update(projectSubscriptions)
      .set({
        polarSubscriptionId: polarSubscriptionRow.id,
        updatedAt: new Date(),
      })
      .where(eq(projectSubscriptions.id, existingProjectSubscription.id))
    projectSubscriptionId = existingProjectSubscription.id
  }

  await db
    .update(projects)
    .set({
      activeProjectSubscriptionId: projectSubscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))

  return {
    claimed: true,
    projectSubscriptionId,
  }
}
