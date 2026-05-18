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

  const existingProjectSubscription =
    await db.query.projectSubscriptions.findFirst({
      columns: { id: true, createdByOperatorId: true },
      where: (t, { eq }) => eq(t.projectId, projectId),
    })

  let projectSubscriptionId: string
  if (existingProjectSubscription == null) {
    const [inserted] = await db
      .insert(projectSubscriptions)
      .values({
        projectId,
        polarSubscriptionId: polarSubscriptionRow.id,
        createdByOperatorId: projectOperatorId,
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
        createdByOperatorId:
          existingProjectSubscription.createdByOperatorId ?? projectOperatorId,
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
    createdByOperatorId: projectOperatorId,
  }
}
