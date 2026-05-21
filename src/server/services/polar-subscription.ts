import 'server-only'
import * as Sentry from '@sentry/nextjs'
import { eq } from 'drizzle-orm'
import type { Subscription } from '@polar-sh/sdk/models/components/subscription.js'
import { db } from '../db'
import {
  polarSubscriptions,
  projects,
  projectOperators,
  projectSubscriptions,
} from '../db/schema'
import { deriveProjectStatus } from './project-status'
import { publishProjectEvent } from '../realtime/publish'
import { z } from 'zod'

const projectSubscriptionMetadataSchema = z.object({
  projectId: z.uuid(),
  projectOperatorId: z.uuid(),
})
export type ProjectSubscriptionMetadata = z.infer<
  typeof projectSubscriptionMetadataSchema
>

export type PolarSubscription = typeof polarSubscriptions.$inferSelect

export async function upsertPolarSubscription(
  rawPolarSubscription: Subscription,
): Promise<PolarSubscription> {
  const polarSubscription =
    await writePolarSubscriptionRow(rawPolarSubscription)

  const result = projectSubscriptionMetadataSchema.safeParse(
    rawPolarSubscription.metadata,
  )
  if (!result.success) {
    Sentry.captureMessage('Polar project subscription claim failed', {
      level: 'warning',
      tags: { reason: 'malformed subscription metadata' },
      extra: {
        polarSubscriptionId: polarSubscription.polarSubscriptionId,
        polarSubscriptionRowId: polarSubscription.id,
        polarSubscription: rawPolarSubscription,
      },
    })
    return polarSubscription
  }

  const { projectId } = result.data
  const project = await db.query.projects.findFirst({
    columns: { id: true },
    where: (t, { eq }) => eq(t.id, projectId),
  })
  if (project == null) {
    Sentry.captureMessage('Polar project subscription claim failed', {
      level: 'warning',
      tags: { reason: 'unknown-project' },
      extra: {
        polarSubscriptionId: polarSubscription.polarSubscriptionId,
        polarSubscriptionRowId: polarSubscription.id,
        polarSubscription: rawPolarSubscription,
      },
    })
    return polarSubscription
  }

  const projectSubscription = await db.query.projectSubscriptions.findFirst({
    columns: { id: true },
    where: (t, { eq }) => eq(t.projectId, projectId),
  })

  let projectSubscriptionId: string
  if (projectSubscription == null) {
    const [inserted] = await db
      .insert(projectSubscriptions)
      .values({
        projectId,
        polarSubscriptionId: polarSubscription.id,
      })
      .returning({ id: projectSubscriptions.id })
    if (inserted == null) {
      throw new Error(
        'upsertPolarSubscription: projectSubscription insert returned no row',
      )
    }
    projectSubscriptionId = inserted.id
  } else {
    await db
      .update(projectSubscriptions)
      .set({
        polarSubscriptionId: polarSubscription.id,
        updatedAt: new Date(),
      })
      .where(eq(projectSubscriptions.id, projectSubscription.id))
    projectSubscriptionId = projectSubscription.id
  }

  const usedSeats = await db.$count(
    projectOperators,
    eq(projectOperators.projectId, projectId),
  )
  const status = deriveProjectStatus({
    polarStatus: polarSubscription.status,
    seats: polarSubscription.seats,
    usedSeats,
  })

  await db
    .update(projects)
    .set({
      activeProjectSubscriptionId: projectSubscriptionId,
      status,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))

  publishProjectEvent(projectId, 'project-subscription-changed')

  return polarSubscription
}

async function writePolarSubscriptionRow(
  polarSubscription: Subscription,
): Promise<PolarSubscription> {
  const existing = await db.query.polarSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.polarSubscriptionId, polarSubscription.id),
  })

  const values = {
    polarSubscriptionId: polarSubscription.id,
    polarCustomerId: polarSubscription.customerId,
    billingEmail: polarSubscription.customer.email ?? '',
    metadata: polarSubscription.metadata ?? null,
    status: polarSubscription.status,
    seats: polarSubscription.seats ?? null,
    currentPeriodStart: polarSubscription.currentPeriodStart,
    currentPeriodEnd: polarSubscription.currentPeriodEnd,
    trialStart: polarSubscription.trialStart,
    trialEnd: polarSubscription.trialEnd,
    cancelAtPeriodEnd: polarSubscription.cancelAtPeriodEnd,
    canceledAt: polarSubscription.canceledAt,
    startedAt: polarSubscription.startedAt,
    endsAt: polarSubscription.endsAt,
    endedAt: polarSubscription.endedAt,
    modifiedAt: polarSubscription.modifiedAt,
    updatedAt: new Date(),
  }

  if (existing == null) {
    const [inserted] = await db
      .insert(polarSubscriptions)
      .values(values)
      .returning()
    if (inserted == null) {
      throw new Error('upsertPolarSubscription: insert returned no row')
    }
    return inserted
  }

  if (
    existing.modifiedAt != null &&
    polarSubscription.modifiedAt != null &&
    existing.modifiedAt > polarSubscription.modifiedAt
  ) {
    return existing
  }

  const [updated] = await db
    .update(polarSubscriptions)
    .set(values)
    .where(eq(polarSubscriptions.id, existing.id))
    .returning()
  if (updated == null) {
    throw new Error('upsertPolarSubscription: update returned no row')
  }
  return updated
}

export async function patchPolarSubscriptionBillingEmail(input: {
  polarCustomerId: string
  billingEmail: string
}): Promise<void> {
  await db
    .update(polarSubscriptions)
    .set({ billingEmail: input.billingEmail, updatedAt: new Date() })
    .where(eq(polarSubscriptions.polarCustomerId, input.polarCustomerId))
}
