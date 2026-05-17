import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { projects, projectSubscriptions } from '../db/schema'
import type { PolarSubscriptionRow } from './polar-subscription'

export type ClaimPolarProjectSubscriptionResult =
  | {
      claimed: true
      projectSubscriptionId: string
      createdByOperatorId: string
    }
  | {
      claimed: false
      reason:
        | 'no-metadata'
        | 'malformed'
        | 'unknown-project'
        | 'unknown-operator'
    }

export async function claimPolarProjectSubscriptionFromEvent(input: {
  polarSubscriptionRow: PolarSubscriptionRow
  metadata: unknown
}): Promise<ClaimPolarProjectSubscriptionResult> {
  const { polarSubscriptionRow, metadata } = input

  if (metadata == null || typeof metadata !== 'object') {
    return { claimed: false, reason: 'no-metadata' }
  }
  const projectId = (metadata as Record<string, unknown>).projectId
  const projectOperatorId = (metadata as Record<string, unknown>)
    .projectOperatorId
  if (typeof projectId !== 'string' || typeof projectOperatorId !== 'string') {
    return { claimed: false, reason: 'malformed' }
  }

  const project = await db.query.projects.findFirst({
    columns: { id: true },
    where: (t, { eq }) => eq(t.id, projectId),
  })
  if (project == null) {
    return { claimed: false, reason: 'unknown-project' }
  }

  const operator = await db.query.projectOperators.findFirst({
    columns: { id: true, projectId: true },
    where: (t, { eq }) => eq(t.id, projectOperatorId),
  })
  if (operator == null || operator.projectId !== projectId) {
    return { claimed: false, reason: 'unknown-operator' }
  }

  const [inserted] = await db
    .insert(projectSubscriptions)
    .values({
      projectId,
      polarSubscriptionId: polarSubscriptionRow.id,
      createdByOperatorId: projectOperatorId,
    })
    .onConflictDoNothing({ target: projectSubscriptions.polarSubscriptionId })
    .returning({ id: projectSubscriptions.id })

  if (inserted == null) {
    const existing = await db.query.projectSubscriptions.findFirst({
      columns: { id: true },
      where: (t, { eq }) => eq(t.polarSubscriptionId, polarSubscriptionRow.id),
    })
    if (existing == null) {
      throw new Error(
        'claimPolarProjectSubscriptionFromEvent: row vanished after conflict',
      )
    }
    return {
      claimed: true,
      projectSubscriptionId: existing.id,
      createdByOperatorId: projectOperatorId,
    }
  }

  await db
    .update(projects)
    .set({ activeProjectSubscriptionId: inserted.id, updatedAt: new Date() })
    .where(eq(projects.id, projectId))

  return {
    claimed: true,
    projectSubscriptionId: inserted.id,
    createdByOperatorId: projectOperatorId,
  }
}
