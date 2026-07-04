import 'server-only'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { db } from '../db'
import { projectInvites, projectOperators } from '../db/schema'
import { deriveCallsignFromName } from '@/lib/callsign'
import { assertSeatAvailable } from './project-subscription'
import { ok } from '@/lib/return-result'
import type { SuccessResult } from '@/lib/return-result'
import { ConflictError, isUniqueViolationError } from '../errors'

export type ProjectInvite = {
  id: string
  projectId: string
  email: string
  status: string
  name: string | null
  callsign: string | null
  claimerUserId: string | null
  inviterProjectOperatorId: string | null
  createdAt: Date
  updatedAt: Date
}

export type ClaimerIdentifier = {
  method: 'Google' | 'Email'
  label: string
}

export type ProjectInviteWithDetails = ProjectInvite & {
  project: { id: string; name: string; slug: string }
  claimerUser: {
    id: string
    name: string
    identifiers: ClaimerIdentifier[]
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
            columns: { type: true, value: true, data: true },
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
    where: (t, { eq, and, notInArray }) =>
      and(
        eq(t.projectId, projectId),
        notInArray(t.status, ['accepted', 'rejected']),
      ),
    orderBy: (t, { desc }) => desc(t.createdAt),
    with: {
      project: {
        columns: { id: true, name: true, slug: true },
      },
      claimerUser: {
        with: {
          identifiers: {
            columns: { type: true, value: true, data: true },
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
  name: string | null
  callsign: string | null
  claimerUserId: string | null
  inviterProjectOperatorId: string | null
  createdAt: Date
  updatedAt: Date
  project: { id: string; name: string; slug: string }
  claimerUser: {
    id: string
    name: string
    identifiers: { type: string; value: string; data: unknown }[]
    notificationEmail: { email: string } | null
  } | null
  inviterProjectOperator: { name: string } | null
}): ProjectInviteWithDetails {
  return {
    id: result.id,
    projectId: result.projectId,
    email: result.email,
    status: result.status,
    name: result.name,
    callsign: result.callsign,
    claimerUserId: result.claimerUserId,
    inviterProjectOperatorId: result.inviterProjectOperatorId,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    project: result.project,
    claimerUser:
      result.claimerUser == null
        ? null
        : {
            id: result.claimerUser.id,
            name: result.claimerUser.name,
            identifiers:
              result.claimerUser.identifiers.map(toClaimerIdentifier),
            notificationEmail: result.claimerUser.notificationEmail,
          },
    inviterOperatorName: result.inviterProjectOperator?.name ?? null,
  }
}

function toClaimerIdentifier(identifier: {
  type: string
  value: string
  data: unknown
}): ClaimerIdentifier {
  if (identifier.type === 'google-oauth') {
    const email =
      typeof identifier.data === 'object' &&
      identifier.data != null &&
      'email' in identifier.data &&
      typeof (identifier.data as { email: unknown }).email === 'string'
        ? (identifier.data as { email: string }).email
        : identifier.value
    return { method: 'Google', label: email }
  }
  return { method: 'Email', label: identifier.value }
}

/**
 * Claim a project invite. Sets the claimer, their requested operator
 * name/callsign, and updates status to 'claimed'.
 */
export async function claimProjectInvite(
  inviteId: string,
  userId: string,
  data: { name: string | null; callsign: string | null },
): Promise<void> {
  await db
    .update(projectInvites)
    .set({
      status: 'claimed',
      claimerUserId: userId,
      name: data.name,
      callsign: data.callsign,
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

export type UpdateProjectInviteRequestInput = {
  name?: string
  callsign?: string
}

/**
 * Update a claimed invite's requested operator name/callsign, scoped to its
 * project. Returns null when the invite is missing or not 'claimed'.
 */
export async function updateProjectInviteRequest(
  inviteId: string,
  projectId: string,
  data: UpdateProjectInviteRequestInput,
): Promise<ProjectInvite | null> {
  const [invite] = await db
    .update(projectInvites)
    .set({
      ...(data.name != null ? { name: data.name } : {}),
      ...(data.callsign != null ? { callsign: data.callsign } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projectInvites.id, inviteId),
        eq(projectInvites.projectId, projectId),
        eq(projectInvites.status, 'claimed'),
      ),
    )
    .returning()

  return invite ?? null
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
        inArray(projectInvites.status, ['pending', 'claimed']),
      ),
    )
}

/**
 * Accept a claimed invite. Creates a project operator for the claimer from
 * the invite's stored name/callsign. The status flip and the operator insert
 * run in one transaction, so a callsign conflict rolls the invite back to
 * 'claimed' (admin reconciles and retries) and surfaces as ConflictError
 * with code 'callsign_taken'.
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

  let attemptedCallsign: string | null = null
  try {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(projectInvites)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(
          and(
            eq(projectInvites.id, inviteId),
            eq(projectInvites.status, 'claimed'),
          ),
        )
        .returning({
          id: projectInvites.id,
          name: projectInvites.name,
          callsign: projectInvites.callsign,
        })

      if (updated == null) {
        throw new ConflictError({
          code: 'invite_not_acceptable',
          message: 'Invite could not be accepted',
        })
      }

      // Claims made before the join-request form have no stored
      // name/callsign — fall back to the user's name for both.
      const name = updated.name ?? claimerUser.name
      const callsign =
        updated.callsign ?? deriveCallsignFromName(claimerUser.name)
      attemptedCallsign = callsign

      const [operator] = await tx
        .insert(projectOperators)
        .values({
          projectId,
          userId: claimerUser.id,
          name,
          callsign,
          role: 'member',
        })
        .returning({ id: projectOperators.id })

      return { projectOperatorId: operator.id }
    })
  } catch (error) {
    if (isUniqueViolationError(error)) {
      // The transaction rolled back — the invite is still 'claimed', so the
      // admin can reconcile the conflicting callsign and retry.
      throw new ConflictError({
        code: 'callsign_taken',
        message: `Callsign "${attemptedCallsign}" is already in use in this project`,
      })
    }
    throw error
  }
}
