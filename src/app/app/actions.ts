'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthUser,
  requireAdminProjectOperator,
  requireProjectOperator,
  requireOperationAccess,
} from '@/server/auth/permissions'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { auth } from '../../server/auth/auth'
import {
  createProject,
  updateProject,
  deleteProject,
} from '@/server/services/project'
import { createProjectOperator } from '@/server/services/project-operator'
import { createIncompleteSubscription } from '@/server/services/project-subscription'
import { createOperation } from '@/server/services/operation'
import { createOperationLog } from '@/server/services/operation-log'
import {
  createObjective,
  updateObjective,
  setObjectiveDone,
  deleteObjective,
} from '@/server/services/objective'

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
    await createIncompleteSubscription({
      projectId: result.data.id,
      billingUserId: user.id,
    })
    await createProjectOperator({
      projectId: result.data.id,
      userId: user.id,
      name: user.name,
      role: 'admin',
    })
    await createProjectOperator({
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
  const { project } = await requireAdminProjectOperator(projectSlug)

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
  const { project } = await requireAdminProjectOperator(projectSlug)

  const result = await deleteProject(project.id)
  if (result.success) {
    revalidatePath('/app')
  }

  return result
}

/**
 * Operations
 */

export async function createOperationAction(
  projectSlug: string,
  title: string,
): Promise<ReturnResult<{ id: string; number: number }>> {
  const { projectOperator, project } = await requireProjectOperator(projectSlug)

  const result = await createOperation({
    projectOperatorId: projectOperator.id,
    projectId: project.id,
    title,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}`)
  }

  return result
}

/**
 * Operation Logs
 */

export async function createOperationLogAction(
  projectSlug: string,
  operationNumber: number,
  content: string,
): Promise<ReturnResult<{ id: string }>> {
  const { projectOperator, project, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
  )

  const result = await createOperationLog({
    projectOperatorId: projectOperator.id,
    projectId: project.id,
    operationId: operation.id,
    content,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/operations/${operationNumber}`)
    return ok({ id: result.data.id })
  }

  return result
}

/**
 * Objectives
 */

export async function createObjectiveAction(
  projectSlug: string,
  operationNumber: number,
  name: string,
  parentObjectiveId?: string,
): Promise<ReturnResult<{ id: string }>> {
  const { projectOperator, project, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
  )

  const result = await createObjective({
    projectOperatorId: projectOperator.id,
    projectId: project.id,
    operationId: operation.id,
    name,
    parentObjectiveId,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/operations/${operationNumber}`)
  }

  return result
}

export async function updateObjectiveAction(
  projectSlug: string,
  operationNumber: number,
  id: string,
  name: string,
): Promise<ReturnResult<undefined>> {
  const { projectOperator, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
  )

  const result = await updateObjective({
    projectOperatorId: projectOperator.id,
    operationId: operation.id,
    objectiveId: id,
    name,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/operations/${operationNumber}`)
  }

  return result
}

export async function setObjectiveDoneAction(
  projectSlug: string,
  operationNumber: number,
  id: string,
  done: boolean,
): Promise<ReturnResult<undefined>> {
  const { projectOperator, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
  )

  const result = await setObjectiveDone({
    projectOperatorId: projectOperator.id,
    operationId: operation.id,
    objectiveId: id,
    done,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/operations/${operationNumber}`)
  }

  return result
}

export async function deleteObjectiveAction(
  projectSlug: string,
  operationNumber: number,
  id: string,
): Promise<ReturnResult<undefined>> {
  const { projectOperator, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
  )

  const result = await deleteObjective({
    projectOperatorId: projectOperator.id,
    operationId: operation.id,
    objectiveId: id,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/operations/${operationNumber}`)
  }

  return result
}
