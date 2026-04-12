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
  slug: string,
  description?: string,
): Promise<ReturnResult<{ id: string; slug: string }>> {
  const user = await getAuthUser()
  if (user == null) {
    return err(new Error('Unauthorized'))
  }

  const result = await createProject(user.id, { name, slug, description })
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
  projectSlug: string,
  name: string,
  description?: string,
): Promise<ReturnResult<undefined>> {
  const { project } = await requireAdminProjectWorker(projectSlug)

  const result = await updateProject(project.id, { name, description })
  if (result.success) {
    revalidatePath('/app')
  }

  return result
}

export async function deleteProjectAction(
  projectSlug: string,
): Promise<ReturnResult<undefined>> {
  const { project } = await requireAdminProjectWorker(projectSlug)

  const result = await deleteProject(project.id)
  if (result.success) {
    revalidatePath('/app')
  }

  return result
}

/**
 * Issues
 */

export async function createIssueAction(
  projectSlug: string,
  title: string,
): Promise<ReturnResult<{ id: string; number: number }>> {
  const { projectWorker, project } = await requireProjectWorker(projectSlug)

  const result = await createIssue({
    projectWorkerId: projectWorker.id,
    projectId: project.id,
    title,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}`)
  }

  return result
}

/**
 * Logs
 */

export async function createLogAction(
  projectSlug: string,
  issueNumber: number,
  content: string,
): Promise<ReturnResult<{ id: string }>> {
  const { projectWorker, project, issue } = await requireIssueAccess(
    projectSlug,
    issueNumber,
  )

  const result = await createLog({
    projectWorkerId: projectWorker.id,
    projectId: project.id,
    issueId: issue.id,
    content,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/issues/${issueNumber}`)
    return ok({ id: result.data.id })
  }

  return result
}

/**
 * Tasks
 */

export async function createTaskAction(
  projectSlug: string,
  issueNumber: number,
  name: string,
  parentTaskId?: string,
): Promise<ReturnResult<{ id: string }>> {
  const { projectWorker, project, issue } = await requireIssueAccess(
    projectSlug,
    issueNumber,
  )

  const result = await createTask({
    projectWorkerId: projectWorker.id,
    projectId: project.id,
    issueId: issue.id,
    name,
    parentTaskId,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/issues/${issueNumber}`)
  }

  return result
}

export async function updateTaskAction(
  projectSlug: string,
  issueNumber: number,
  id: string,
  name: string,
): Promise<ReturnResult<undefined>> {
  const { projectWorker, issue } = await requireIssueAccess(
    projectSlug,
    issueNumber,
  )

  const result = await updateTask({
    projectWorkerId: projectWorker.id,
    issueId: issue.id,
    taskId: id,
    name,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/issues/${issueNumber}`)
  }

  return result
}

export async function setTaskDoneAction(
  projectSlug: string,
  issueNumber: number,
  id: string,
  done: boolean,
): Promise<ReturnResult<undefined>> {
  const { projectWorker, issue } = await requireIssueAccess(
    projectSlug,
    issueNumber,
  )

  const result = await setTaskDone({
    projectWorkerId: projectWorker.id,
    issueId: issue.id,
    taskId: id,
    done,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/issues/${issueNumber}`)
  }

  return result
}

export async function deleteTaskAction(
  projectSlug: string,
  issueNumber: number,
  id: string,
): Promise<ReturnResult<undefined>> {
  const { projectWorker, issue } = await requireIssueAccess(
    projectSlug,
    issueNumber,
  )

  const result = await deleteTask({
    projectWorkerId: projectWorker.id,
    issueId: issue.id,
    taskId: id,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/issues/${issueNumber}`)
  }

  return result
}
