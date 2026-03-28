import 'server-only'
import { db } from '../db'
import { skills } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'

export type Skill = {
  id: string
  name: string
  content: string
  position: number
  createdAt: Date
  updatedAt: Date
}

/**
 * List skills for a project (ordered by position)
 */
export async function listSkills(projectId: string): Promise<Skill[]> {
  return db.query.skills.findMany({
    columns: {
      id: true,
      name: true,
      content: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
    where: (t, { eq }) => eq(t.projectId, projectId),
    orderBy: (t, { asc }) => asc(t.position),
  })
}

/**
 * Get a single skill
 */
export async function getSkill(
  projectId: string,
  skillId: string,
): Promise<Skill | null> {
  const skill = await db.query.skills.findFirst({
    columns: {
      id: true,
      name: true,
      content: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
    where: (t, { eq, and }) =>
      and(eq(t.id, skillId), eq(t.projectId, projectId)),
  })
  return skill ?? null
}

/**
 * Create a new skill
 */
export async function createSkill(
  projectId: string,
  data: { name: string; content: string },
): Promise<ReturnResult<{ id: string }>> {
  const existingSkills = await db.query.skills.findMany({
    columns: { position: true },
    where: (t, { eq }) => eq(t.projectId, projectId),
    orderBy: (t, { asc }) => asc(t.position),
  })

  const maxPosition =
    existingSkills.length > 0
      ? Math.max(...existingSkills.map((s) => s.position))
      : -1

  const [skill] = await db
    .insert(skills)
    .values({
      projectId,
      name: data.name,
      content: data.content,
      position: maxPosition + 1,
    })
    .returning({ id: skills.id })

  return ok({ id: skill.id })
}

/**
 * Update a skill
 */
export async function updateSkill(
  projectId: string,
  skillId: string,
  data: { name?: string; content?: string },
): Promise<ReturnResult<undefined>> {
  const [skill] = await db
    .update(skills)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(skills.id, skillId), eq(skills.projectId, projectId)))
    .returning({ id: skills.id })

  if (!skill) {
    return err(new NotFoundError('Skill'))
  }

  return ok()
}

/**
 * Delete a skill
 */
export async function deleteSkill(
  projectId: string,
  skillId: string,
): Promise<ReturnResult<undefined>> {
  const [skill] = await db
    .delete(skills)
    .where(and(eq(skills.id, skillId), eq(skills.projectId, projectId)))
    .returning({ id: skills.id })

  if (!skill) {
    return err(new NotFoundError('Skill'))
  }

  return ok()
}
