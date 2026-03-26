import 'server-only'
import { db } from '../db'
import { tasks, issues } from '../db/schema'
import { eq, and, isNull, gt, gte, lt, lte, sql } from 'drizzle-orm'
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
