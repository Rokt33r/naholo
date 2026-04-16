import 'server-only'
import { db } from '../db'
import { tasks, issues } from '../db/schema'
import { eq, and, isNull, gt, gte, lt, lte, sql, inArray } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'

export type Task = {
  id: string
  parentTaskId: string | null
  name: string
  note: string | null
  done: boolean
  position: number
  createdAt: Date
  updatedAt: Date
}

/**
 * List tasks for an issue (hierarchical)
 */
export async function listTasks(data: { issueId: string }): Promise<Task[]> {
  return db.query.tasks.findMany({
    columns: {
      id: true,
      parentTaskId: true,
      name: true,
      note: true,
      done: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
    where: (t, { eq }) => eq(t.issueId, data.issueId),
    orderBy: (t, { asc }) => asc(t.position),
  })
}

/**
 * Create a new task. If position is provided, shifts existing tasks at or after that position.
 * Otherwise appends to the end.
 */
export async function createTask(data: {
  projectWorkerId: string
  projectId: string
  issueId: string
  name: string
  note?: string | null
  parentTaskId?: string | null
  position?: number
}): Promise<ReturnResult<{ id: string }>> {
  const parentTaskId = data.parentTaskId ?? null

  let position: number
  if (data.position !== undefined) {
    // Shift existing tasks at or after the target position
    await db
      .update(tasks)
      .set({
        position: sql`${tasks.position} + 1`,
      })
      .where(
        and(
          eq(tasks.issueId, data.issueId),
          parentTaskId
            ? eq(tasks.parentTaskId, parentTaskId)
            : isNull(tasks.parentTaskId),
          gte(tasks.position, data.position),
        ),
      )
    position = data.position
  } else {
    // Get the maximum position for tasks at this level
    const existingTasks = await db.query.tasks.findMany({
      columns: { position: true },
      where: (t, { eq, and, isNull }) =>
        and(
          eq(t.issueId, data.issueId),
          parentTaskId
            ? eq(t.parentTaskId, parentTaskId)
            : isNull(t.parentTaskId),
        ),
      orderBy: (t, { asc }) => asc(t.position),
    })

    const maxPosition =
      existingTasks.length > 0
        ? Math.max(...existingTasks.map((t) => t.position))
        : -1
    position = maxPosition + 1
  }

  const [task] = await db
    .insert(tasks)
    .values({
      projectId: data.projectId,
      issueId: data.issueId,
      projectWorkerId: data.projectWorkerId,
      parentTaskId,
      name: data.name,
      note: data.note ?? null,
      position,
    })
    .returning({ id: tasks.id })

  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, data.issueId))

  return ok({ id: task.id })
}

/**
 * Update a task.
 */
export async function updateTask(data: {
  projectWorkerId: string
  issueId: string
  taskId: string
  name: string
}): Promise<ReturnResult<undefined>> {
  const [task] = await db
    .update(tasks)
    .set({
      name: data.name,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tasks.id, data.taskId),
        eq(tasks.projectWorkerId, data.projectWorkerId),
      ),
    )
    .returning({ id: tasks.id })

  if (!task) {
    return err(new NotFoundError('Task'))
  }

  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, data.issueId))

  return ok()
}

/**
 * Set a task's done status.
 */
export async function setTaskDone(data: {
  projectWorkerId: string
  issueId: string
  taskId: string
  done: boolean
}): Promise<ReturnResult<undefined>> {
  const [task] = await db
    .update(tasks)
    .set({
      done: data.done,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tasks.id, data.taskId),
        eq(tasks.projectWorkerId, data.projectWorkerId),
      ),
    )
    .returning({ id: tasks.id })

  if (!task) {
    return err(new NotFoundError('Task'))
  }

  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, data.issueId))

  return ok()
}

/**
 * Update a task's note.
 */
export async function updateTaskNote(data: {
  projectWorkerId: string
  issueId: string
  taskId: string
  note: string | null
}): Promise<ReturnResult<undefined>> {
  const [task] = await db
    .update(tasks)
    .set({
      note: data.note,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tasks.id, data.taskId),
        eq(tasks.projectWorkerId, data.projectWorkerId),
      ),
    )
    .returning({ id: tasks.id })

  if (!task) {
    return err(new NotFoundError('Task'))
  }

  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, data.issueId))

  return ok()
}

/**
 * Delete a task.
 */
export async function deleteTask(data: {
  projectWorkerId: string
  issueId: string
  taskId: string
}): Promise<ReturnResult<undefined>> {
  const [task] = await db
    .delete(tasks)
    .where(
      and(
        eq(tasks.id, data.taskId),
        eq(tasks.projectWorkerId, data.projectWorkerId),
      ),
    )
    .returning({ id: tasks.id })

  if (!task) {
    return err(new NotFoundError('Task'))
  }

  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, data.issueId))

  return ok()
}

/**
 * Move a task to a new parent and/or position.
 */
export async function moveTask(data: {
  projectWorkerId: string
  issueId: string
  taskId: string
  newParentTaskId: string | null
  newPosition: number
}): Promise<ReturnResult<undefined>> {
  // Get the current task
  const currentTask = await db.query.tasks.findFirst({
    columns: {
      id: true,
      parentTaskId: true,
      position: true,
    },
    where: (t, { eq, and }) =>
      and(
        eq(t.id, data.taskId),
        eq(t.projectWorkerId, data.projectWorkerId),
        eq(t.issueId, data.issueId),
      ),
  })

  if (!currentTask) {
    return err(new NotFoundError('Task'))
  }

  const oldParentId = currentTask.parentTaskId
  const oldPosition = currentTask.position
  const newParentId = data.newParentTaskId
  const newPosition = data.newPosition

  // Check if we're moving to the same place
  if (oldParentId === newParentId && oldPosition === newPosition) {
    return ok()
  }

  const sameParent = oldParentId === newParentId

  if (sameParent) {
    // Moving within the same parent - just reorder
    if (oldPosition < newPosition) {
      // Moving down: shift tasks between old and new position up
      await db
        .update(tasks)
        .set({
          position: sql`${tasks.position} - 1`,
        })
        .where(
          and(
            eq(tasks.issueId, data.issueId),
            eq(tasks.projectWorkerId, data.projectWorkerId),
            oldParentId
              ? eq(tasks.parentTaskId, oldParentId)
              : isNull(tasks.parentTaskId),
            gt(tasks.position, oldPosition),
            lte(tasks.position, newPosition),
          ),
        )
    } else {
      // Moving up: shift tasks between new and old position down
      await db
        .update(tasks)
        .set({
          position: sql`${tasks.position} + 1`,
        })
        .where(
          and(
            eq(tasks.issueId, data.issueId),
            eq(tasks.projectWorkerId, data.projectWorkerId),
            oldParentId
              ? eq(tasks.parentTaskId, oldParentId)
              : isNull(tasks.parentTaskId),
            gte(tasks.position, newPosition),
            lt(tasks.position, oldPosition),
          ),
        )
    }
  } else {
    // Moving to a different parent
    // 1. Close the gap at the old location
    await db
      .update(tasks)
      .set({
        position: sql`${tasks.position} - 1`,
      })
      .where(
        and(
          eq(tasks.issueId, data.issueId),
          eq(tasks.projectWorkerId, data.projectWorkerId),
          oldParentId
            ? eq(tasks.parentTaskId, oldParentId)
            : isNull(tasks.parentTaskId),
          gt(tasks.position, oldPosition),
        ),
      )

    // 2. Make room at the new location
    await db
      .update(tasks)
      .set({
        position: sql`${tasks.position} + 1`,
      })
      .where(
        and(
          eq(tasks.issueId, data.issueId),
          eq(tasks.projectWorkerId, data.projectWorkerId),
          newParentId
            ? eq(tasks.parentTaskId, newParentId)
            : isNull(tasks.parentTaskId),
          gte(tasks.position, newPosition),
        ),
      )
  }

  // Update the task's position and parent
  await db
    .update(tasks)
    .set({
      parentTaskId: newParentId,
      position: newPosition,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tasks.id, data.taskId),
        eq(tasks.projectWorkerId, data.projectWorkerId),
      ),
    )

  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, data.issueId))

  return ok()
}

// ---- Sync (bulk) ----

export type SyncTaskNode = {
  id?: string
  name: string
  done?: boolean
  childTasks?: SyncTaskNode[]
}

/**
 * Sync the full task tree for an issue.
 * Accepts the complete task tree and a list of task IDs to delete.
 * Resolves positions from array order, creates new tasks, updates existing,
 * and preserves orphans (server tasks not in the tree) at the top.
 *
 * Executes in 3 mutations + 1 read:
 *   1. DELETE tasks in taskIdsToDelete
 *   2. INSERT all new tasks (name + done only)
 *   3. UPDATE all tasks with resolved position, parentTaskId, name, done
 */
export async function syncTasks(data: {
  projectWorkerId: string
  projectId: string
  issueId: string
  tasks: SyncTaskNode[]
  taskIdsToDelete: string[]
}): Promise<ReturnResult<{ created: { id: string; name: string }[] }>> {
  // Mutation 1 — Delete (before read so orphan detection doesn't need deleteSet)
  if (data.taskIdsToDelete.length > 0) {
    await db
      .delete(tasks)
      .where(
        and(
          eq(tasks.issueId, data.issueId),
          inArray(tasks.id, data.taskIdsToDelete),
        ),
      )
  }

  // Collect input task IDs
  const inputIds = new Set<string>()
  function collectIds(nodes: SyncTaskNode[]): void {
    for (const node of nodes) {
      if (node.id != null) {
        inputIds.add(node.id)
      }
      if (node.childTasks != null) {
        collectIds(node.childTasks)
      }
    }
  }
  collectIds(data.tasks)

  // Read existing tasks (post-delete)
  const existingTasks = await db.query.tasks.findMany({
    columns: {
      id: true,
      parentTaskId: true,
      name: true,
      done: true,
      position: true,
    },
    where: (t, { eq }) => eq(t.issueId, data.issueId),
    orderBy: (t, { asc }) => asc(t.position),
  })
  const existingMap = new Map(existingTasks.map((t) => [t.id, t]))

  // Identify orphans (exist on server, not in input tree)
  const orphanIdSet = new Set<string>()
  for (const t of existingTasks) {
    if (!inputIds.has(t.id)) {
      orphanIdSet.add(t.id)
    }
  }

  // Root orphans: parent is null or parent is not an orphan
  const rootOrphanIds = [...orphanIdSet].filter((id) => {
    const t = existingMap.get(id)!
    return t.parentTaskId == null || !orphanIdSet.has(t.parentTaskId)
  })

  // Walk tree, collect desired state for every task
  type DesiredTask = {
    tempId: string
    existingId: string | null // null = new task
    parentTempId: string | null
    name: string
    done: boolean
    position: number
  }
  const desired: DesiredTask[] = []
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
    nodes: SyncTaskNode[],
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

      if (node.childTasks != null) {
        walkTree(node.childTasks, tempId, 0)
      }
    }
  }
  walkTree(data.tasks, null, rootOrphanIds.length)

  // Mutation 2 — Bulk insert new tasks
  const tempToReal = new Map<string, string>()
  const created: { id: string; name: string }[] = []

  // Map existing tasks' tempId → real ID
  for (const d of desired) {
    if (d.existingId != null) {
      tempToReal.set(d.tempId, d.existingId)
    }
  }

  const newTasks = desired.filter((d) => d.existingId == null)
  if (newTasks.length > 0) {
    const inserted = await db
      .insert(tasks)
      .values(
        newTasks.map((t) => ({
          projectId: data.projectId,
          issueId: data.issueId,
          projectWorkerId: data.projectWorkerId,
          name: t.name,
          done: t.done,
          position: 0, // placeholder — resolved in mutation 3
        })),
      )
      .returning({ id: tasks.id })

    for (let i = 0; i < newTasks.length; i++) {
      tempToReal.set(newTasks[i].tempId, inserted[i].id)
      created.push({ id: inserted[i].id, name: newTasks[i].name })
    }
  }

  // Mutation 3 — Bulk update all tasks with resolved position + parentTaskId
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
        parentTaskId: parentRealId,
      }
    })

    await db.execute(
      sql`UPDATE tasks AS t SET
        name = v.name,
        done = v.done,
        position = v.position,
        parent_task_id = v.parent_task_id,
        updated_at = NOW()
      FROM (VALUES ${sql.join(
        values.map(
          (v) =>
            sql`(${v.id}::uuid, ${v.name}::text, ${v.done}::boolean, ${v.position}::integer, ${v.parentTaskId == null ? sql`NULL` : sql`${v.parentTaskId}`}::uuid)`,
        ),
        sql`, `,
      )}) AS v(id, name, done, position, parent_task_id)
      WHERE t.id = v.id`,
    )
  }

  // Touch issue
  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, data.issueId))

  return ok({ created })
}
