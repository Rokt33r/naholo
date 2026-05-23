import 'server-only'
import { db } from '../db'
import { operationTasks, operations } from '../db/schema'
import { eq, and, isNull, gt, gte, lt, lte, sql, inArray } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from '../errors'
import { publishOperationEvent, publishProjectEvent } from '../realtime/publish'

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

export async function listTasks(data: {
  operationId: string
}): Promise<Task[]> {
  return db.query.operationTasks.findMany({
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
    where: (t, { eq }) => eq(t.operationId, data.operationId),
    orderBy: (t, { asc }) => asc(t.position),
  })
}

export async function createTask(data: {
  projectOperatorId: string
  projectId: string
  operationId: string
  name: string
  note?: string | null
  parentTaskId?: string | null
  position?: number
  sourceClientId?: string
}): Promise<ReturnResult<{ id: string }>> {
  const parentTaskId = data.parentTaskId ?? null

  let position: number
  if (data.position !== undefined) {
    await db
      .update(operationTasks)
      .set({
        position: sql`${operationTasks.position} + 1`,
      })
      .where(
        and(
          eq(operationTasks.operationId, data.operationId),
          parentTaskId
            ? eq(operationTasks.parentTaskId, parentTaskId)
            : isNull(operationTasks.parentTaskId),
          gte(operationTasks.position, data.position),
        ),
      )
    position = data.position
  } else {
    const existingTasks = await db.query.operationTasks.findMany({
      columns: { position: true },
      where: (t, { eq, and, isNull }) =>
        and(
          eq(t.operationId, data.operationId),
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
    .insert(operationTasks)
    .values({
      projectId: data.projectId,
      operationId: data.operationId,
      projectOperatorId: data.projectOperatorId,
      parentTaskId,
      name: data.name,
      note: data.note ?? null,
      position,
    })
    .returning({ id: operationTasks.id })

  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  publishOperationEvent(data.operationId, 'tasks-changed', data.sourceClientId)
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok({ id: task.id })
}

export async function updateTask(data: {
  projectOperatorId: string
  projectId: string
  operationId: string
  taskId: string
  name: string
  sourceClientId?: string
}): Promise<ReturnResult<undefined>> {
  const [task] = await db
    .update(operationTasks)
    .set({
      name: data.name,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operationTasks.id, data.taskId),
        eq(operationTasks.projectOperatorId, data.projectOperatorId),
      ),
    )
    .returning({ id: operationTasks.id })

  if (!task) {
    return err(new NotFoundError('Task'))
  }

  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  publishOperationEvent(data.operationId, 'tasks-changed', data.sourceClientId)
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok()
}

export async function setTaskDone(data: {
  projectOperatorId: string
  projectId: string
  operationId: string
  taskId: string
  done: boolean
  sourceClientId?: string
}): Promise<ReturnResult<undefined>> {
  const [task] = await db
    .update(operationTasks)
    .set({
      done: data.done,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operationTasks.id, data.taskId),
        eq(operationTasks.projectOperatorId, data.projectOperatorId),
      ),
    )
    .returning({ id: operationTasks.id })

  if (!task) {
    return err(new NotFoundError('Task'))
  }

  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  publishOperationEvent(data.operationId, 'tasks-changed', data.sourceClientId)
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok()
}

export async function updateTaskNote(data: {
  projectOperatorId: string
  projectId: string
  operationId: string
  taskId: string
  note: string | null
  sourceClientId?: string
}): Promise<ReturnResult<undefined>> {
  const [task] = await db
    .update(operationTasks)
    .set({
      note: data.note,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operationTasks.id, data.taskId),
        eq(operationTasks.projectOperatorId, data.projectOperatorId),
      ),
    )
    .returning({ id: operationTasks.id })

  if (!task) {
    return err(new NotFoundError('Task'))
  }

  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  publishOperationEvent(data.operationId, 'tasks-changed', data.sourceClientId)
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok()
}

export async function deleteTask(data: {
  projectOperatorId: string
  projectId: string
  operationId: string
  taskId: string
  sourceClientId?: string
}): Promise<ReturnResult<undefined>> {
  const [task] = await db
    .delete(operationTasks)
    .where(
      and(
        eq(operationTasks.id, data.taskId),
        eq(operationTasks.projectOperatorId, data.projectOperatorId),
      ),
    )
    .returning({ id: operationTasks.id })

  if (!task) {
    return err(new NotFoundError('Task'))
  }

  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  publishOperationEvent(data.operationId, 'tasks-changed', data.sourceClientId)
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok()
}

export async function moveTask(data: {
  projectOperatorId: string
  projectId: string
  operationId: string
  taskId: string
  newParentTaskId: string | null
  newPosition: number
  sourceClientId?: string
}): Promise<ReturnResult<undefined>> {
  const currentTask = await db.query.operationTasks.findFirst({
    columns: {
      id: true,
      parentTaskId: true,
      position: true,
    },
    where: (t, { eq, and }) =>
      and(
        eq(t.id, data.taskId),
        eq(t.projectOperatorId, data.projectOperatorId),
        eq(t.operationId, data.operationId),
      ),
  })

  if (!currentTask) {
    return err(new NotFoundError('Task'))
  }

  const oldParentId = currentTask.parentTaskId
  const oldPosition = currentTask.position
  const newParentId = data.newParentTaskId
  const newPosition = data.newPosition

  if (oldParentId === newParentId && oldPosition === newPosition) {
    return ok()
  }

  const sameParent = oldParentId === newParentId

  if (sameParent) {
    if (oldPosition < newPosition) {
      await db
        .update(operationTasks)
        .set({
          position: sql`${operationTasks.position} - 1`,
        })
        .where(
          and(
            eq(operationTasks.operationId, data.operationId),
            eq(operationTasks.projectOperatorId, data.projectOperatorId),
            oldParentId
              ? eq(operationTasks.parentTaskId, oldParentId)
              : isNull(operationTasks.parentTaskId),
            gt(operationTasks.position, oldPosition),
            lte(operationTasks.position, newPosition),
          ),
        )
    } else {
      await db
        .update(operationTasks)
        .set({
          position: sql`${operationTasks.position} + 1`,
        })
        .where(
          and(
            eq(operationTasks.operationId, data.operationId),
            eq(operationTasks.projectOperatorId, data.projectOperatorId),
            oldParentId
              ? eq(operationTasks.parentTaskId, oldParentId)
              : isNull(operationTasks.parentTaskId),
            gte(operationTasks.position, newPosition),
            lt(operationTasks.position, oldPosition),
          ),
        )
    }
  } else {
    await db
      .update(operationTasks)
      .set({
        position: sql`${operationTasks.position} - 1`,
      })
      .where(
        and(
          eq(operationTasks.operationId, data.operationId),
          eq(operationTasks.projectOperatorId, data.projectOperatorId),
          oldParentId
            ? eq(operationTasks.parentTaskId, oldParentId)
            : isNull(operationTasks.parentTaskId),
          gt(operationTasks.position, oldPosition),
        ),
      )

    await db
      .update(operationTasks)
      .set({
        position: sql`${operationTasks.position} + 1`,
      })
      .where(
        and(
          eq(operationTasks.operationId, data.operationId),
          eq(operationTasks.projectOperatorId, data.projectOperatorId),
          newParentId
            ? eq(operationTasks.parentTaskId, newParentId)
            : isNull(operationTasks.parentTaskId),
          gte(operationTasks.position, newPosition),
        ),
      )
  }

  await db
    .update(operationTasks)
    .set({
      parentTaskId: newParentId,
      position: newPosition,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operationTasks.id, data.taskId),
        eq(operationTasks.projectOperatorId, data.projectOperatorId),
      ),
    )

  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  publishOperationEvent(data.operationId, 'tasks-changed', data.sourceClientId)
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok()
}

// ---- Sync (bulk) ----

export type SyncTaskNode = {
  id?: string
  name: string
  done?: boolean
  childTasks?: SyncTaskNode[]
}

export async function syncTasks(data: {
  projectOperatorId: string
  projectId: string
  operationId: string
  tasks: SyncTaskNode[]
  taskIdsToDelete: string[]
  sourceClientId?: string
}): Promise<ReturnResult<{ created: { id: string; name: string }[] }>> {
  if (data.taskIdsToDelete.length > 0) {
    await db
      .delete(operationTasks)
      .where(
        and(
          eq(operationTasks.operationId, data.operationId),
          inArray(operationTasks.id, data.taskIdsToDelete),
        ),
      )
  }

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

  const existingTasks = await db.query.operationTasks.findMany({
    columns: {
      id: true,
      parentTaskId: true,
      name: true,
      done: true,
      position: true,
    },
    where: (t, { eq }) => eq(t.operationId, data.operationId),
    orderBy: (t, { asc }) => asc(t.position),
  })
  const existingMap = new Map(existingTasks.map((t) => [t.id, t]))

  const orphanIdSet = new Set<string>()
  for (const t of existingTasks) {
    if (!inputIds.has(t.id)) {
      orphanIdSet.add(t.id)
    }
  }

  const rootOrphanIds = [...orphanIdSet].filter((id) => {
    const t = existingMap.get(id)!
    return t.parentTaskId == null || !orphanIdSet.has(t.parentTaskId)
  })

  type DesiredTask = {
    tempId: string
    existingId: string | null
    parentTempId: string | null
    name: string
    done: boolean
    position: number
  }
  const desired: DesiredTask[] = []
  let tempCounter = 0

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

  const tempToReal = new Map<string, string>()
  const created: { id: string; name: string }[] = []

  for (const d of desired) {
    if (d.existingId != null) {
      tempToReal.set(d.tempId, d.existingId)
    }
  }

  const newTasks = desired.filter((d) => d.existingId == null)
  if (newTasks.length > 0) {
    const inserted = await db
      .insert(operationTasks)
      .values(
        newTasks.map((t) => ({
          projectId: data.projectId,
          operationId: data.operationId,
          projectOperatorId: data.projectOperatorId,
          name: t.name,
          done: t.done,
          position: 0,
        })),
      )
      .returning({ id: operationTasks.id })

    for (let i = 0; i < newTasks.length; i++) {
      tempToReal.set(newTasks[i].tempId, inserted[i].id)
      created.push({ id: inserted[i].id, name: newTasks[i].name })
    }
  }

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
      sql`UPDATE operation_tasks AS t SET
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
      WHERE t.id = v.id AND t.operation_id = ${data.operationId}::uuid`,
    )
  }

  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  publishOperationEvent(data.operationId, 'tasks-changed', data.sourceClientId)
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok({ created })
}
