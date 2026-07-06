import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { projects, projectOperators } from '../db/schema'
import { NotFoundError } from '../errors'
import { isActiveSubscriptionStatus } from './project-subscription'

export type ProjectStatus = 'free' | 'active' | 'suspended' | 'seats-exceeded'

export function deriveProjectStatus(input: {
  polarStatus: string | null
  seats: number | null
  usedSeats: number
}): ProjectStatus {
  const { polarStatus, seats, usedSeats } = input

  if (polarStatus != null && isActiveSubscriptionStatus(polarStatus)) {
    const cap = seats ?? 1
    if (usedSeats > cap) {
      return 'seats-exceeded'
    }
    return 'active'
  }

  if (usedSeats > 1) {
    return 'suspended'
  }

  return 'free'
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

  const status = deriveProjectStatus({
    polarStatus: polarSubscription?.status ?? null,
    seats: polarSubscription?.seats ?? null,
    usedSeats,
  })

  await db
    .update(projects)
    .set({ status, updatedAt: new Date() })
    .where(eq(projects.id, projectId))

  return status
}
