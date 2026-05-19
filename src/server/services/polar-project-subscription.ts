import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { projects, projectSubscriptions } from '../db/schema'
import {
  upsertPolarSubscription,
  type PolarSubscriptionRow,
} from './polar-subscription'
import { parseProjectSubscriptionMetadata } from '../billing/project-subscription-metadata'
import { getPolarServerClient } from '../billing/polar'

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

  const projectSubscriptionId = await linkProjectSubscription({
    projectId,
    polarSubscriptionRowId: polarSubscriptionRow.id,
  })

  return {
    claimed: true,
    projectSubscriptionId,
  }
}

export type ReconcileProjectSubscriptionResult =
  | { found: false }
  | {
      found: true
      projectSubscriptionId: string
      polarSubscription: PolarSubscriptionRow
      status: string
    }

export async function reconcileProjectSubscriptionFromPolar(
  projectId: string,
): Promise<ReconcileProjectSubscriptionResult> {
  const polar = getPolarServerClient()

  let activeSubscriptionId: string
  try {
    const state = await polar.customers.getStateExternal({
      externalId: projectId,
    })
    const [first] = state.activeSubscriptions
    if (first == null) {
      return { found: false }
    }
    activeSubscriptionId = first.id
  } catch (error) {
    // The Polar SDK throws on 404 when the externalId is unknown — treat as
    // "nothing to reconcile" so a brand-new project can proceed to checkout.
    if (isPolarNotFound(error)) {
      return { found: false }
    }
    throw error
  }

  const full = await polar.subscriptions.get({ id: activeSubscriptionId })
  const { row } = await upsertPolarSubscription(full)

  const projectSubscriptionId = await linkProjectSubscription({
    projectId,
    polarSubscriptionRowId: row.id,
  })

  return {
    found: true,
    projectSubscriptionId,
    polarSubscription: row,
    status: row.status,
  }
}

async function linkProjectSubscription(input: {
  projectId: string
  polarSubscriptionRowId: string
}): Promise<string> {
  const { projectId, polarSubscriptionRowId } = input

  const existing = await db.query.projectSubscriptions.findFirst({
    columns: { id: true },
    where: (t, { eq }) => eq(t.projectId, projectId),
  })

  let projectSubscriptionId: string
  if (existing == null) {
    const [inserted] = await db
      .insert(projectSubscriptions)
      .values({
        projectId,
        polarSubscriptionId: polarSubscriptionRowId,
      })
      .returning({ id: projectSubscriptions.id })
    if (inserted == null) {
      throw new Error('linkProjectSubscription: insert returned no row')
    }
    projectSubscriptionId = inserted.id
  } else {
    await db
      .update(projectSubscriptions)
      .set({
        polarSubscriptionId: polarSubscriptionRowId,
        updatedAt: new Date(),
      })
      .where(eq(projectSubscriptions.id, existing.id))
    projectSubscriptionId = existing.id
  }

  await db
    .update(projects)
    .set({
      activeProjectSubscriptionId: projectSubscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))

  return projectSubscriptionId
}

export async function findProjectIdByPolarSubscriptionRowId(
  polarSubscriptionRowId: string,
): Promise<string | null> {
  const link = await db.query.projectSubscriptions.findFirst({
    columns: { projectId: true },
    where: (t, { eq }) => eq(t.polarSubscriptionId, polarSubscriptionRowId),
  })
  return link?.projectId ?? null
}

function isPolarNotFound(error: unknown): boolean {
  if (error == null || typeof error !== 'object') {
    return false
  }
  const status = (error as { statusCode?: unknown; status?: unknown })
    .statusCode
  const altStatus = (error as { status?: unknown }).status
  return status === 404 || altStatus === 404
}
