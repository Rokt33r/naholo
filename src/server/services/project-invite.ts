import 'server-only'
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '../db'
import { projectInvites } from '../db/schema'
import { createProjectOperator } from './project-operator'
import { assertSeatAvailable } from './project-subscription'
import { ok } from '@/lib/return-result'
import type { SuccessResult } from '@/lib/return-result'
import { ConflictError } from '../errors'

export type ProjectInvite = {
  id: string
  projectId: string
  email: string
  status: string
  claimerUserId: string | null
  inviterProjectOperatorId: string | null
  createdAt: Date
  updatedAt: Date
}

export type ProjectInviteWithDetails = ProjectInvite & {
  project: { id: string; name: string; slug: string }
  claimerUser: {
    id: string
    name: string
    identifiers: { type: string; value: string }[]
    notificationEmail: { email: string } | null
  } | null
  inviterOperatorName: string | null
}

/**
 * Create a project invite. Returns the invite ID to use in the invite URL.
 */
export async function createProjectInvite(
  projectId: string,
  email: string,
  inviterProjectOperatorId: string,
): Promise<SuccessResult<{ id: string }>> {
  const [invite] = await db
    .insert(projectInvites)
    .values({
      projectId,
      email,
      inviterProjectOperatorId,
    })
    .returning({ id: projectInvites.id })

  return ok({ id: invite.id })
}

/**
 * Get a project invite by ID with project info and claimer details.
 */
export async function getProjectInvite(
  inviteId: string,
): Promise<ProjectInviteWithDetails | null> {
  const result = await db.query.projectInvites.findFirst({
    where: (t, { eq }) => eq(t.id, inviteId),
    with: {
      project: {
        columns: { id: true, name: true, slug: true },
      },
      claimerUser: {
        with: {
          identifiers: {
            columns: { type: true, value: true },
          },
          notificationEmail: {
            columns: { email: true },
          },
        },
      },
      inviterProjectOperator: {
        columns: { name: true },
      },
    },
  })

  if (result == null) {
    return null
  }

  return mapInviteResult(result)
}

/**
 * List all invites for a project with claimer info.
 */
export async function listProjectInvites(
  projectId: string,
): Promise<ProjectInviteWithDetails[]> {
  const results = await db.query.projectInvites.findMany({
    where: (t, { eq }) => eq(t.projectId, projectId),
    orderBy: (t, { desc }) => desc(t.createdAt),
    with: {
      project: {
        columns: { id: true, name: true, slug: true },
      },
      claimerUser: {
        with: {
          identifiers: {
            columns: { type: true, value: true },
          },
          notificationEmail: {
            columns: { email: true },
          },
        },
      },
      inviterProjectOperator: {
        columns: { name: true },
      },
    },
  })

  return results.map(mapInviteResult)
}

function mapInviteResult(result: {
  id: string
  projectId: string
  email: string
  status: string
  claimerUserId: string | null
  inviterProjectOperatorId: string | null
  createdAt: Date
  updatedAt: Date
  project: { id: string; name: string; slug: string }
  claimerUser: {
    id: string
    name: string
    identifiers: { type: string; value: string }[]
    notificationEmail: { email: string } | null
  } | null
  inviterProjectOperator: { name: string } | null
}): ProjectInviteWithDetails {
  return {
    id: result.id,
    projectId: result.projectId,
    email: result.email,
    status: result.status,
    claimerUserId: result.claimerUserId,
    inviterProjectOperatorId: result.inviterProjectOperatorId,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    project: result.project,
    claimerUser: result.claimerUser,
    inviterOperatorName: result.inviterProjectOperator?.name ?? null,
  }
}

/**
 * Claim a project invite. Sets the claimer and updates status to 'claimed'.
 */
export async function claimProjectInvite(
  inviteId: string,
  userId: string,
): Promise<void> {
  await db
    .update(projectInvites)
    .set({
      status: 'claimed',
      claimerUserId: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projectInvites.id, inviteId),
        eq(projectInvites.status, 'pending'),
        isNull(projectInvites.claimerUserId),
      ),
    )
}

/**
 * Reject a claimed invite.
 */
export async function rejectProjectInvite(inviteId: string): Promise<void> {
  await db
    .update(projectInvites)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(
      and(
        eq(projectInvites.id, inviteId),
        eq(projectInvites.status, 'claimed'),
      ),
    )
}

/**
 * Accept a claimed invite. Creates a project worker for the claimer.
 */
export async function acceptProjectInvite(
  inviteId: string,
  projectId: string,
  claimerUser: { id: string; name: string },
): Promise<{ projectOperatorId: string }> {
  const seatCheck = await assertSeatAvailable(projectId)
  if (!seatCheck.success) {
    throw seatCheck.error
  }

  const [updated] = await db
    .update(projectInvites)
    .set({ status: 'accepted', updatedAt: new Date() })
    .where(
      and(
        eq(projectInvites.id, inviteId),
        eq(projectInvites.status, 'claimed'),
      ),
    )
    .returning({ id: projectInvites.id })

  if (updated == null) {
    throw new ConflictError('Invite could not be accepted')
  }

  const operator = await createProjectOperator({
    projectId,
    userId: claimerUser.id,
    name: claimerUser.name,
    type: 'user',
    role: 'member',
  })

  return { projectOperatorId: operator.id }
}
