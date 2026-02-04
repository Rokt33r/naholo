import 'server-only'
import { db } from '../db'
import { tasks, issues } from '../db/schema'
import { eq, and, asc, isNull } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'

export type Task = {
  id: string
  parentTaskId: string | null
  content: string
  done: boolean
  position: number
  createdAt: Date
  updatedAt: Date
}

export type CreateTaskInput = {
  projectId: string
  issueId: string
  content: string
  parentTaskId?: string
}

/**
 * List tasks for an issue (hierarchical)
 */
export async function listTasks(
  userId: string,
  issueId: string,
): Promise<Task[]> {
  const result = await db
    .select({
      id: tasks.id,
      parentTaskId: tasks.parentTaskId,
      content: tasks.content,
      done: tasks.done,
      position: tasks.position,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(and(eq(tasks.issueId, issueId), eq(tasks.userId, userId)))
    .orderBy(asc(tasks.position))

  return result
}

/**
 * Create a new task
 */
export async function createTask(
  userId: string,
  data: CreateTaskInput,
): Promise<ReturnResult<{ id: string }>> {
  // Validate issue exists for user
  const [issue] = await db
    .select({ id: issues.id })
    .from(issues)
    .where(and(eq(issues.id, data.issueId), eq(issues.userId, userId)))
    .limit(1)

  if (!issue) return err(new NotFoundError('Issue'))

  // Get the maximum position for tasks at this level
  const existingTasks = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(
      and(
        eq(tasks.issueId, data.issueId),
        eq(tasks.userId, userId),
        data.parentTaskId
          ? eq(tasks.parentTaskId, data.parentTaskId)
          : isNull(tasks.parentTaskId),
      ),
    )
    .orderBy(tasks.position)

  const maxPosition =
    existingTasks.length > 0
      ? Math.max(...existingTasks.map((t) => t.position))
      : -1

  const [task] = await db
    .insert(tasks)
    .values({
      projectId: data.projectId,
      issueId: data.issueId,
      userId,
      parentTaskId: data.parentTaskId || null,
      content: data.content,
      position: maxPosition + 1,
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
export async function updateTask(
  userId: string,
  issueId: string,
  taskId: string,
  content: string,
): Promise<ReturnResult<undefined>> {
  const [task] = await db
    .update(tasks)
    .set({
      content,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ id: tasks.id })

  if (!task) return err(new NotFoundError('Task'))

  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId))

  return ok()
}

/**
 * Set a task's done status.
 */
export async function setTaskDone(
  userId: string,
  issueId: string,
  taskId: string,
  done: boolean,
): Promise<ReturnResult<undefined>> {
  const [task] = await db
    .update(tasks)
    .set({
      done,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ id: tasks.id })

  if (!task) return err(new NotFoundError('Task'))

  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId))

  return ok()
}

/**
 * Delete a task.
 */
export async function deleteTask(
  userId: string,
  issueId: string,
  taskId: string,
): Promise<ReturnResult<undefined>> {
  const [task] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ id: tasks.id })

  if (!task) return err(new NotFoundError('Task'))

  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId))

  return ok()
}
