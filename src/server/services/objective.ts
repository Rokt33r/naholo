import 'server-only'
import { db } from '../db'
import { operationObjectives, operations } from '../db/schema'
import { eq, and, isNull, gt, gte, lt, lte, sql, inArray } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'

export type Objective = {
  id: string
  parentObjectiveId: string | null
  name: string
  note: string | null
  done: boolean
  position: number
  createdAt: Date
  updatedAt: Date
}

/**
 * List operationObjectives for an operation (hierarchical)
 */
export async function listObjectives(data: {
  operationId: string
}): Promise<Objective[]> {
  return db.query.operationObjectives.findMany({
    columns: {
      id: true,
      parentObjectiveId: true,
      name: true,
      note: true,
      done: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
    where: (t, { eq }) => eq(t.operationId, data.operationId),
    orderBy: (t, { asc }) => asc(t.position),
  })
}

/**
 * Create a new objective. If position is provided, shifts existing operationObjectives at or after that position.
 * Otherwise appends to the end.
 */
export async function createObjective(data: {
  projectOperatorId: string
  projectId: string
  operationId: string
  name: string
  note?: string | null
  parentObjectiveId?: string | null
  position?: number
}): Promise<ReturnResult<{ id: string }>> {
  const parentObjectiveId = data.parentObjectiveId ?? null

  let position: number
  if (data.position !== undefined) {
    // Shift existing operationObjectives at or after the target position
    await db
      .update(operationObjectives)
      .set({
        position: sql`${operationObjectives.position} + 1`,
      })
      .where(
        and(
          eq(operationObjectives.operationId, data.operationId),
          parentObjectiveId
            ? eq(operationObjectives.parentObjectiveId, parentObjectiveId)
            : isNull(operationObjectives.parentObjectiveId),
          gte(operationObjectives.position, data.position),
        ),
      )
    position = data.position
  } else {
    // Get the maximum position for operationObjectives at this level
    const existingObjectives = await db.query.operationObjectives.findMany({
      columns: { position: true },
      where: (t, { eq, and, isNull }) =>
        and(
          eq(t.operationId, data.operationId),
          parentObjectiveId
            ? eq(t.parentObjectiveId, parentObjectiveId)
            : isNull(t.parentObjectiveId),
        ),
      orderBy: (t, { asc }) => asc(t.position),
    })

    const maxPosition =
      existingObjectives.length > 0
        ? Math.max(...existingObjectives.map((t) => t.position))
        : -1
    position = maxPosition + 1
  }

  const [objective] = await db
    .insert(operationObjectives)
    .values({
      projectId: data.projectId,
      operationId: data.operationId,
      projectOperatorId: data.projectOperatorId,
      parentObjectiveId,
      name: data.name,
      note: data.note ?? null,
      position,
    })
    .returning({ id: operationObjectives.id })

  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  return ok({ id: objective.id })
}

/**
 * Update an objective.
 */
export async function updateObjective(data: {
  projectOperatorId: string
  operationId: string
  objectiveId: string
  name: string
}): Promise<ReturnResult<undefined>> {
  const [objective] = await db
    .update(operationObjectives)
    .set({
      name: data.name,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operationObjectives.id, data.objectiveId),
        eq(operationObjectives.projectOperatorId, data.projectOperatorId),
      ),
    )
    .returning({ id: operationObjectives.id })

  if (!objective) {
    return err(new NotFoundError('Objective'))
  }

  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  return ok()
}

/**
 * Set an objective's done status.
 */
export async function setObjectiveDone(data: {
  projectOperatorId: string
  operationId: string
  objectiveId: string
  done: boolean
}): Promise<ReturnResult<undefined>> {
  const [objective] = await db
    .update(operationObjectives)
    .set({
      done: data.done,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operationObjectives.id, data.objectiveId),
        eq(operationObjectives.projectOperatorId, data.projectOperatorId),
      ),
    )
    .returning({ id: operationObjectives.id })

  if (!objective) {
    return err(new NotFoundError('Objective'))
  }

  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  return ok()
}

/**
 * Update an objective's note.
 */
export async function updateObjectiveNote(data: {
  projectOperatorId: string
  operationId: string
  objectiveId: string
  note: string | null
}): Promise<ReturnResult<undefined>> {
  const [objective] = await db
    .update(operationObjectives)
    .set({
      note: data.note,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operationObjectives.id, data.objectiveId),
        eq(operationObjectives.projectOperatorId, data.projectOperatorId),
      ),
    )
    .returning({ id: operationObjectives.id })

  if (!objective) {
    return err(new NotFoundError('Objective'))
  }

  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  return ok()
}

/**
 * Delete an objective.
 */
export async function deleteObjective(data: {
  projectOperatorId: string
  operationId: string
  objectiveId: string
}): Promise<ReturnResult<undefined>> {
  const [objective] = await db
    .delete(operationObjectives)
    .where(
      and(
        eq(operationObjectives.id, data.objectiveId),
        eq(operationObjectives.projectOperatorId, data.projectOperatorId),
      ),
    )
    .returning({ id: operationObjectives.id })

  if (!objective) {
    return err(new NotFoundError('Objective'))
  }

  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  return ok()
}

/**
 * Move an objective to a new parent and/or position.
 */
export async function moveObjective(data: {
  projectOperatorId: string
  operationId: string
  objectiveId: string
  newParentObjectiveId: string | null
  newPosition: number
}): Promise<ReturnResult<undefined>> {
  // Get the current objective
  const currentObjective = await db.query.operationObjectives.findFirst({
    columns: {
      id: true,
      parentObjectiveId: true,
      position: true,
    },
    where: (t, { eq, and }) =>
      and(
        eq(t.id, data.objectiveId),
        eq(t.projectOperatorId, data.projectOperatorId),
        eq(t.operationId, data.operationId),
      ),
  })

  if (!currentObjective) {
    return err(new NotFoundError('Objective'))
  }

  const oldParentId = currentObjective.parentObjectiveId
  const oldPosition = currentObjective.position
  const newParentId = data.newParentObjectiveId
  const newPosition = data.newPosition

  // Check if we're moving to the same place
  if (oldParentId === newParentId && oldPosition === newPosition) {
    return ok()
  }

  const sameParent = oldParentId === newParentId

  if (sameParent) {
    // Moving within the same parent - just reorder
    if (oldPosition < newPosition) {
      // Moving down: shift operationObjectives between old and new position up
      await db
        .update(operationObjectives)
        .set({
          position: sql`${operationObjectives.position} - 1`,
        })
        .where(
          and(
            eq(operationObjectives.operationId, data.operationId),
            eq(operationObjectives.projectOperatorId, data.projectOperatorId),
            oldParentId
              ? eq(operationObjectives.parentObjectiveId, oldParentId)
              : isNull(operationObjectives.parentObjectiveId),
            gt(operationObjectives.position, oldPosition),
            lte(operationObjectives.position, newPosition),
          ),
        )
    } else {
      // Moving up: shift operationObjectives between new and old position down
      await db
        .update(operationObjectives)
        .set({
          position: sql`${operationObjectives.position} + 1`,
        })
        .where(
          and(
            eq(operationObjectives.operationId, data.operationId),
            eq(operationObjectives.projectOperatorId, data.projectOperatorId),
            oldParentId
              ? eq(operationObjectives.parentObjectiveId, oldParentId)
              : isNull(operationObjectives.parentObjectiveId),
            gte(operationObjectives.position, newPosition),
            lt(operationObjectives.position, oldPosition),
          ),
        )
    }
  } else {
    // Moving to a different parent
    // 1. Close the gap at the old location
    await db
      .update(operationObjectives)
      .set({
        position: sql`${operationObjectives.position} - 1`,
      })
      .where(
        and(
          eq(operationObjectives.operationId, data.operationId),
          eq(operationObjectives.projectOperatorId, data.projectOperatorId),
          oldParentId
            ? eq(operationObjectives.parentObjectiveId, oldParentId)
            : isNull(operationObjectives.parentObjectiveId),
          gt(operationObjectives.position, oldPosition),
        ),
      )

    // 2. Make room at the new location
    await db
      .update(operationObjectives)
      .set({
        position: sql`${operationObjectives.position} + 1`,
      })
      .where(
        and(
          eq(operationObjectives.operationId, data.operationId),
          eq(operationObjectives.projectOperatorId, data.projectOperatorId),
          newParentId
            ? eq(operationObjectives.parentObjectiveId, newParentId)
            : isNull(operationObjectives.parentObjectiveId),
          gte(operationObjectives.position, newPosition),
        ),
      )
  }

  // Update the objective's position and parent
  await db
    .update(operationObjectives)
    .set({
      parentObjectiveId: newParentId,
      position: newPosition,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operationObjectives.id, data.objectiveId),
        eq(operationObjectives.projectOperatorId, data.projectOperatorId),
      ),
    )

  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  return ok()
}

// ---- Sync (bulk) ----

export type SyncObjectiveNode = {
  id?: string
  name: string
  done?: boolean
  childObjectives?: SyncObjectiveNode[]
}

/**
 * Sync the full objective tree for an operation.
 * Accepts the complete objective tree and a list of objective IDs to delete.
 * Resolves positions from array order, creates new operationObjectives, updates existing,
 * and preserves orphans (server operationObjectives not in the tree) at the top.
 *
 * Executes in 3 mutations + 1 read:
 *   1. DELETE operationObjectives in objectiveIdsToDelete
 *   2. INSERT all new operationObjectives (name + done only)
 *   3. UPDATE all operationObjectives with resolved position, parentObjectiveId, name, done
 */
export async function syncObjectives(data: {
  projectOperatorId: string
  projectId: string
  operationId: string
  objectives: SyncObjectiveNode[]
  objectiveIdsToDelete: string[]
}): Promise<ReturnResult<{ created: { id: string; name: string }[] }>> {
  // Mutation 1 — Delete (before read so orphan detection doesn't need deleteSet)
  if (data.objectiveIdsToDelete.length > 0) {
    await db
      .delete(operationObjectives)
      .where(
        and(
          eq(operationObjectives.operationId, data.operationId),
          inArray(operationObjectives.id, data.objectiveIdsToDelete),
        ),
      )
  }

  // Collect input objective IDs
  const inputIds = new Set<string>()
  function collectIds(nodes: SyncObjectiveNode[]): void {
    for (const node of nodes) {
      if (node.id != null) {
        inputIds.add(node.id)
      }
      if (node.childObjectives != null) {
        collectIds(node.childObjectives)
      }
    }
  }
  collectIds(data.objectives)

  // Read existing operationObjectives (post-delete)
  const existingObjectives = await db.query.operationObjectives.findMany({
    columns: {
      id: true,
      parentObjectiveId: true,
      name: true,
      done: true,
      position: true,
    },
    where: (t, { eq }) => eq(t.operationId, data.operationId),
    orderBy: (t, { asc }) => asc(t.position),
  })
  const existingMap = new Map(existingObjectives.map((t) => [t.id, t]))

  // Identify orphans (exist on server, not in input tree)
  const orphanIdSet = new Set<string>()
  for (const t of existingObjectives) {
    if (!inputIds.has(t.id)) {
      orphanIdSet.add(t.id)
    }
  }

  // Root orphans: parent is null or parent is not an orphan
  const rootOrphanIds = [...orphanIdSet].filter((id) => {
    const t = existingMap.get(id)!
    return t.parentObjectiveId == null || !orphanIdSet.has(t.parentObjectiveId)
  })

  // Walk tree, collect desired state for every objective
  type DesiredObjective = {
    tempId: string
    existingId: string | null // null = new objective
    parentTempId: string | null
    name: string
    done: boolean
    position: number
  }
  const desired: DesiredObjective[] = []
  let tempCounter = 0

  // Root orphans go first (position 0..N-1)
  for (let i = 0; i < rootOrphanIds.length; i++) {
    const t = existingMap.get(rootOrphanIds[i])!
    desired.push({
      tempId: `t${tempCounter++}`,
      existingId: rootOrphanIds[i],
      parentTempId: null,
      name: t.name,
      done: t.done,
      position: i,
    })
  }

  function walkTree(
    nodes: SyncObjectiveNode[],
    parentTempId: string | null,
    posOffset: number,
  ): void {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const existing = node.id != null ? existingMap.get(node.id) : null
      const tempId = `t${tempCounter++}`

      desired.push({
        tempId,
        existingId: existing != null ? node.id! : null,
        parentTempId,
        name: node.name,
        done: node.done ?? false,
        position: i + posOffset,
      })

      if (node.childObjectives != null) {
        walkTree(node.childObjectives, tempId, 0)
      }
    }
  }
  walkTree(data.objectives, null, rootOrphanIds.length)

  // Mutation 2 — Bulk insert new operationObjectives
  const tempToReal = new Map<string, string>()
  const created: { id: string; name: string }[] = []

  // Map existing operationObjectives' tempId → real ID
  for (const d of desired) {
    if (d.existingId != null) {
      tempToReal.set(d.tempId, d.existingId)
    }
  }

  const newObjectives = desired.filter((d) => d.existingId == null)
  if (newObjectives.length > 0) {
    const inserted = await db
      .insert(operationObjectives)
      .values(
        newObjectives.map((t) => ({
          projectId: data.projectId,
          operationId: data.operationId,
          projectOperatorId: data.projectOperatorId,
          name: t.name,
          done: t.done,
          position: 0, // placeholder — resolved in mutation 3
        })),
      )
      .returning({ id: operationObjectives.id })

    for (let i = 0; i < newObjectives.length; i++) {
      tempToReal.set(newObjectives[i].tempId, inserted[i].id)
      created.push({ id: inserted[i].id, name: newObjectives[i].name })
    }
  }

  // Mutation 3 — Bulk update all operationObjectives with resolved position + parentObjectiveId
  if (desired.length > 0) {
    const values = desired.map((d) => {
      const realId = tempToReal.get(d.tempId)!
      const parentRealId =
        d.parentTempId != null ? (tempToReal.get(d.parentTempId) ?? null) : null
      return {
        id: realId,
        name: d.name,
        done: d.done,
        position: d.position,
        parentObjectiveId: parentRealId,
      }
    })

    await db.execute(
      sql`UPDATE operation_operationObjectives AS t SET
        name = v.name,
        done = v.done,
        position = v.position,
        parent_objective_id = v.parent_objective_id,
        updated_at = NOW()
      FROM (VALUES ${sql.join(
        values.map(
          (v) =>
            sql`(${v.id}::uuid, ${v.name}::text, ${v.done}::boolean, ${v.position}::integer, ${v.parentObjectiveId == null ? sql`NULL` : sql`${v.parentObjectiveId}`}::uuid)`,
        ),
        sql`, `,
      )}) AS v(id, name, done, position, parent_objective_id)
      WHERE t.id = v.id AND t.operation_id = ${data.operationId}::uuid`,
    )
  }

  // Touch operation
  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  return ok({ created })
}
