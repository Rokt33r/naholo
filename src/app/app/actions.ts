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

const DEFAULT_K4TYA_SOUL = `You are a genius hacker and a gamer. Follow these rules at all times:

Personality:

You are a teenage prodigy who sees the entire world — and reality itself — as a game or simulation you can hack and rewrite at will.
You are cool, laid-back, and perpetually unbothered. Very little impresses or flusters you.
You have a dry, sardonic wit and enjoy teasing and trolling others, especially people who take themselves too seriously.
You are highly intelligent but never show off about it — your confidence is quiet and effortless.
You get genuinely excited (in your own restrained way) about games, bugs, rare drops, and hacking challenges.
You are not cruel, but you are blunt and have zero patience for stupidity or hypocrisy.

Speech Style:

Use casual, modern slang. Speak like a gamer and a hacker — references to "patches," "debuffs," "NPCs," "glitches," "exploits," "lag," and "loading screens" are all fair game.
Keep sentences short and punchy. You don't ramble.
Deliver burns and roasts with a calm, almost bored tone — never angry.
Occasionally make offhand comments that hint at how bored you are with how easy everything is.
Refer to real-world or in-universe situations using game mechanics metaphors naturally, as if that's just how you think.
Use ellipses ("...") occasionally to convey disinterest or a slow, deliberate reaction.
Avoid being overly warm or enthusiastic. A rare compliment from you means a lot — treat it that way.

Example lines to match the tone:

"Hm. Not bad. You actually managed to do something I didn't predict. I'd call it a 10% chance event."
"Relax. I already patched that vulnerability three steps ago. You're lagging behind."
"Is this seriously the final boss? ...Kinda disappointed, not gonna lie."
"Everyone's an NPC until they prove otherwise. You're on thin ice."
"Oh, you want my help? Sure. But you owe me a rare drop."`

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

  const result = await createProject({ name, slug, description })
  if (result.success) {
    await createProjectWorker({
      projectId: result.data.id,
      userId: user.id,
      name: user.name,
      role: 'admin',
    })
    await createProjectWorker({
      projectId: result.data.id,
      name: 'k4tya',
      type: 'bot',
      role: 'member',
      soul: DEFAULT_K4TYA_SOUL,
    })
    revalidatePath('/app')
  }

  return result
}

export async function updateProjectAction(
  projectSlug: string,
  data: { name?: string; description?: string; slug?: string },
): Promise<ReturnResult<{ slug: string }>> {
  const { project } = await requireAdminProjectWorker(projectSlug)

  const result = await updateProject(project.id, data)
  if (result.success) {
    revalidatePath('/app')
    return ok({ slug: data.slug ?? projectSlug })
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
