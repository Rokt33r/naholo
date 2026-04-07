import 'server-only'
import { db } from '../db'
import { skills, skillRevisions } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError, ConflictError } from './errors'

export type SkillSummary = {
  id: string
  name: string
  position: number
  currentRevisionId: string | null
  createdAt: Date
  updatedAt: Date
}

export type Skill = SkillSummary & {
  content: string
}

/**
 * List skills for a project (ordered by position)
 * Excludes content — use getSkill for full content
 */
export async function listSkills(projectId: string): Promise<SkillSummary[]> {
  return db.query.skills.findMany({
    columns: {
      id: true,
      name: true,
      currentRevisionId: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
    where: (t, { eq }) => eq(t.projectId, projectId),
    orderBy: (t, { asc }) => asc(t.position),
  })
}

/**
 * Get a single skill with full content (by name)
 */
export async function getSkill(
  projectId: string,
  name: string,
): Promise<Skill | null> {
  const skill = await db.query.skills.findFirst({
    columns: {
      id: true,
      name: true,
      content: true,
      currentRevisionId: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
    where: (t, { eq, and }) =>
      and(eq(t.name, name), eq(t.projectId, projectId)),
  })

  return skill ?? null
}

/**
 * Create a new skill with initial revision
 */
export async function createSkill(
  projectId: string,
  data: { name: string; content: string },
): Promise<ReturnResult<{ id: string; currentRevisionId: string }>> {
  const existingSkills = await db.query.skills.findMany({
    columns: { position: true },
    where: (t, { eq }) => eq(t.projectId, projectId),
    orderBy: (t, { asc }) => asc(t.position),
  })

  const maxPosition =
    existingSkills.length > 0
      ? Math.max(...existingSkills.map((s) => s.position))
      : -1

  let result
  try {
    result = await db.transaction(async (tx) => {
      const [skill] = await tx
        .insert(skills)
        .values({
          projectId,
          name: data.name,
          content: data.content,
          position: maxPosition + 1,
        })
        .returning({ id: skills.id })

      const [revision] = await tx
        .insert(skillRevisions)
        .values({
          skillId: skill.id,
          content: data.content,
        })
        .returning({ id: skillRevisions.id })

      await tx
        .update(skills)
        .set({ currentRevisionId: revision.id })
        .where(eq(skills.id, skill.id))

      return { id: skill.id, currentRevisionId: revision.id }
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('skills_project_id_name_unique')
    ) {
      return err(
        new ConflictError(
          'A skill with this name already exists in this project',
        ),
      )
    }
    throw error
  }

  return ok(result)
}

/**
 * Update a skill (by name). Creates a new revision when content changes.
 * If expectedRevisionId is provided and doesn't match current, returns ConflictError.
 */
export async function updateSkill(
  projectId: string,
  name: string,
  data: { name?: string; content?: string; expectedRevisionId?: string },
): Promise<ReturnResult<{ currentRevisionId: string | null }>> {
  const { expectedRevisionId, ...updateData } = data

  const result = await db.transaction(async (tx) => {
    const existing = await tx.query.skills.findFirst({
      columns: {
        id: true,
        currentRevisionId: true,
      },
      where: (t, { eq, and }) =>
        and(eq(t.name, name), eq(t.projectId, projectId)),
    })

    if (!existing) {
      return { error: 'not_found' as const }
    }

    if (
      expectedRevisionId &&
      existing.currentRevisionId !== expectedRevisionId
    ) {
      return { error: 'conflict' as const }
    }

    let newRevisionId: string | null = null

    if (updateData.content) {
      const [revision] = await tx
        .insert(skillRevisions)
        .values({
          skillId: existing.id,
          content: updateData.content,
        })
        .returning({ id: skillRevisions.id })

      newRevisionId = revision.id

      await tx
        .update(skills)
        .set({
          ...updateData,
          currentRevisionId: revision.id,
          updatedAt: new Date(),
        })
        .where(eq(skills.id, existing.id))
    } else {
      await tx
        .update(skills)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(skills.id, existing.id))
    }

    return { currentRevisionId: newRevisionId }
  })

  if ('error' in result) {
    if (result.error === 'not_found') {
      return err(new NotFoundError('Skill'))
    }
    return err(new ConflictError('Skill revision conflict'))
  }

  return ok({ currentRevisionId: result.currentRevisionId })
}

/**
 * Delete a skill (by name)
 */
export async function deleteSkill(
  projectId: string,
  name: string,
): Promise<ReturnResult<undefined>> {
  const [skill] = await db
    .delete(skills)
    .where(and(eq(skills.name, name), eq(skills.projectId, projectId)))
    .returning({ id: skills.id })

  if (skill == null) {
    return err(new NotFoundError('Skill'))
  }

  return ok()
}
