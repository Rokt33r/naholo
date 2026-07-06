import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { projects, projectOperators } from '../db/schema'
import { NotFoundError } from '../errors'
import { isActiveSubscriptionStatus } from './project-subscription'

export type ProjectStatus = 'active' | 'trial' | 'inactive' | 'seats-exceeded'

export type DeriveProjectStatusResult = {
  status: ProjectStatus
  trialUntil: Date | null
}

export function deriveProjectStatus(input: {
  polarStatus: string | null
  seats: number | null
  usedSeats: number
  trial: { expiresAt: Date } | null
  now?: Date
}): DeriveProjectStatusResult {
  const { polarStatus, seats, usedSeats, trial } = input
  const now = input.now ?? new Date()

  if (polarStatus != null && isActiveSubscriptionStatus(polarStatus)) {
    const cap = seats ?? 1
    if (usedSeats > cap) {
      return { status: 'seats-exceeded', trialUntil: null }
    }
    return { status: 'active', trialUntil: null }
  }

  if (trial != null && trial.expiresAt > now) {
    return { status: 'trial', trialUntil: trial.expiresAt }
  }

  return { status: 'inactive', trialUntil: null }
}

export async function recomputeProjectStatus(
  projectId: string,
): Promise<ProjectStatus> {
  const project = await db.query.projects.findFirst({
    columns: { id: true },
    with: {
      activeProjectSubscription: {
        with: {
          polarSubscription: { columns: { status: true, seats: true } },
        },
      },
    },
    where: (t, { eq }) => eq(t.id, projectId),
  })
  if (project == null) {
    throw new NotFoundError('Project')
  }
  const polarSubscription =
    project.activeProjectSubscription?.polarSubscription ?? null

  const usedSeats = await db.$count(
    projectOperators,
    eq(projectOperators.projectId, projectId),
  )
  const projectTrial = await db.query.projectTrials.findFirst({
    columns: { expiresAt: true },
    where: (t, { eq }) => eq(t.projectId, projectId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  })

  const { status, trialUntil } = deriveProjectStatus({
    polarStatus: polarSubscription?.status ?? null,
    seats: polarSubscription?.seats ?? null,
    usedSeats,
    trial: projectTrial ?? null,
  })

  await db
    .update(projects)
    .set({ status, trialUntil, updatedAt: new Date() })
    .where(eq(projects.id, projectId))

  return status
}
