'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthUser,
  requireAdminProjectWorker,
  requireProjectWorker,
  requireIssueAccess,
} from '@/server/auth/permissions'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { auth } from '../../server/auth/auth'
import {
  createProject,
  updateProject,
  deleteProject,
} from '@/server/services/project'
import { createProjectWorker } from '@/server/services/project-worker'
import { createIssue } from '@/server/services/issue'
import { createLog } from '@/server/services/log'
import {
  createTask,
  updateTask,
  setTaskDone,
  deleteTask,
} from '@/server/services/task'

export async function refreshSessionAction() {
  return auth.refreshSession()
}

export async function logoutAction(): Promise<ReturnResult<undefined>> {
  await auth.signOut()
  return ok()
}

/**
 * Projects
 */

export async function createProjectAction(
  name: string,
  description?: string,
): Promise<ReturnResult<{ id: string }>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const result = await createProject(user.id, { name, description })
  if (result.success) {
    await createProjectWorker({
      projectId: result.data.id,
      userId: user.id,
      name: user.name,
      role: 'admin',
    })
    revalidatePath('/app')
  }

  return result
}

export async function updateProjectAction(
  id: string,
  name: string,
  description?: string,
): Promise<ReturnResult<undefined>> {
  await requireAdminProjectWorker(id)

  const result = await updateProject(id, { name, description })
  if (result.success) {
    revalidatePath('/app')
  }

  return result
}

export async function deleteProjectAction(
  id: string,
): Promise<ReturnResult<undefined>> {
  await requireAdminProjectWorker(id)

  const result = await deleteProject(id)
  if (result.success) {
    revalidatePath('/app')
  }

  return result
}

/**
 * Issues
 */

export async function createIssueAction(
  projectId: string,
  title: string,
): Promise<ReturnResult<{ id: string; number: number }>> {
  const { projectWorker } = await requireProjectWorker(projectId)

  const result = await createIssue({
    projectWorkerId: projectWorker.id,
    projectId,
    title,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectId}`)
  }

  return result
}

/**
 * Logs
 */

export async function createLogAction(
  projectId: string,
  issueNumber: number,
  content: string,
): Promise<ReturnResult<{ id: string }>> {
  const { projectWorker, issue } = await requireIssueAccess(
    projectId,
    issueNumber,
  )

  const result = await createLog({
    projectWorkerId: projectWorker.id,
    projectId,
    issueId: issue.id,
    content,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectId}/issues/${issueNumber}`)
    return ok({ id: result.data.id })
  }

  return result
}

/**
 * Tasks
 */

export async function createTaskAction(
  projectId: string,
  issueNumber: number,
  name: string,
  parentTaskId?: string,
): Promise<ReturnResult<{ id: string }>> {
  const { projectWorker, issue } = await requireIssueAccess(
    projectId,
    issueNumber,
  )

  const result = await createTask({
    projectWorkerId: projectWorker.id,
    projectId,
    issueId: issue.id,
    name,
    parentTaskId,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectId}/issues/${issueNumber}`)
  }

  return result
}

export async function updateTaskAction(
  projectId: string,
  issueNumber: number,
  id: string,
  name: string,
): Promise<ReturnResult<undefined>> {
  const { projectWorker, issue } = await requireIssueAccess(
    projectId,
    issueNumber,
  )

  const result = await updateTask({
    projectWorkerId: projectWorker.id,
    issueId: issue.id,
    taskId: id,
    name,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectId}/issues/${issueNumber}`)
  }

  return result
}

export async function setTaskDoneAction(
  projectId: string,
  issueNumber: number,
  id: string,
  done: boolean,
): Promise<ReturnResult<undefined>> {
  const { projectWorker, issue } = await requireIssueAccess(
    projectId,
    issueNumber,
  )

  const result = await setTaskDone({
    projectWorkerId: projectWorker.id,
    issueId: issue.id,
    taskId: id,
    done,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectId}/issues/${issueNumber}`)
  }

  return result
}

export async function deleteTaskAction(
  projectId: string,
  issueNumber: number,
  id: string,
): Promise<ReturnResult<undefined>> {
  const { projectWorker, issue } = await requireIssueAccess(
    projectId,
    issueNumber,
  )

  const result = await deleteTask({
    projectWorkerId: projectWorker.id,
    issueId: issue.id,
    taskId: id,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectId}/issues/${issueNumber}`)
  }

  return result
}
