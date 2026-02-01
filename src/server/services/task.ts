import 'server-only'
import { db } from '../db'
import { tasks, issues } from '../db/schema'
import { eq, and, asc, isNull } from 'drizzle-orm'

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

export type TaskContext = {
  projectId: string
  issueId: string
}

/**
 * List tasks for an issue (hierarchical)
 */
export async function listTasks(
  userId: string,
  issueId: string,
): Promise<Task[]> {
  return await db
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
}

/**
 * Create a new task
 */
export async function createTask(
  userId: string,
  data: CreateTaskInput,
): Promise<{ id: string }> {
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

  return { id: task.id }
}

/**
 * Update a task. Returns context for revalidation.
 */
export async function updateTask(
  userId: string,
  taskId: string,
  content: string,
): Promise<TaskContext | null> {
  const [task] = await db
    .update(tasks)
    .set({
      content,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ projectId: tasks.projectId, issueId: tasks.issueId })

  if (!task) return null

  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, task.issueId))

  return { projectId: task.projectId, issueId: task.issueId }
}

/**
 * Set a task's done status. Returns context for revalidation.
 */
export async function setTaskDone(
  userId: string,
  taskId: string,
  done: boolean,
): Promise<TaskContext | null> {
  const [task] = await db
    .update(tasks)
    .set({
      done,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ projectId: tasks.projectId, issueId: tasks.issueId })

  if (!task) return null

  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, task.issueId))

  return { projectId: task.projectId, issueId: task.issueId }
}

/**
 * Delete a task. Returns context for revalidation.
 */
export async function deleteTask(
  userId: string,
  taskId: string,
): Promise<TaskContext | null> {
  const [task] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ projectId: tasks.projectId, issueId: tasks.issueId })

  if (!task) return null

  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, task.issueId))

  return { projectId: task.projectId, issueId: task.issueId }
}
