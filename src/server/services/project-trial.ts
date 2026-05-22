import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { projects, projectTrials, projectOperators } from '../db/schema'
import { ConflictError } from '../errors'
import { isUniqueViolationError } from '../db/utils'
import { deriveProjectStatus } from './project-status'

export const TRIAL_DURATION_DAYS = 30

const MS_PER_DAY = 24 * 60 * 60 * 1000

type ProjectTrial = {
  id: string
  userId: string
  projectId: string
  expiresAt: Date
  createdAt: Date
}

export async function getProjectTrialForUser(
  userId: string,
): Promise<ProjectTrial | null> {
  const row = await db.query.projectTrials.findFirst({
    where: (t, { eq }) => eq(t.userId, userId),
  })
  if (row == null) {
    return null
  }
  return {
    id: row.id,
    userId: row.userId,
    projectId: row.projectId,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  }
}

export async function claimProjectTrial(input: {
  userId: string
  projectId: string
}): Promise<{ expiresAt: Date }> {
  const { userId, projectId } = input

  const now = new Date()
  const expiresAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * MS_PER_DAY)

  return db.transaction(async (tx) => {
    try {
      await tx.insert(projectTrials).values({
        userId,
        projectId,
        expiresAt,
      })
    } catch (error) {
      if (isUniqueViolationError(error)) {
        throw new ConflictError({
          code: 'trial_already_used',
          message: 'This account has already used its free trial.',
        })
      }
      throw error
    }

    const project = await tx.query.projects.findFirst({
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
    const polarSubscription =
      project?.activeProjectSubscription?.polarSubscription ?? null

    const usedSeats = await tx.$count(
      projectOperators,
      eq(projectOperators.projectId, projectId),
    )

    const { status, trialUntil } = deriveProjectStatus({
      polarStatus: polarSubscription?.status ?? null,
      seats: polarSubscription?.seats ?? null,
      usedSeats,
      trial: { expiresAt },
      now,
    })

    await tx
      .update(projects)
      .set({ status, trialUntil, updatedAt: now })
      .where(eq(projects.id, projectId))

    return { expiresAt }
  })
}
