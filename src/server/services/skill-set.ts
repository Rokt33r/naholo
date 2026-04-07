import 'server-only'
import { db } from '../db'
import { skillSets } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { ConflictError } from './errors'

export type SkillSetSummary = {
  id: string
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}

export type SkillSet = SkillSetSummary

/**
 * List skill sets for a project (ordered by createdAt asc)
 */
export async function listSkillSets(
  projectId: string,
): Promise<SkillSetSummary[]> {
  return db.query.skillSets.findMany({
    columns: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
    },
    where: (t, { eq }) => eq(t.projectId, projectId),
    orderBy: (t, { asc }) => asc(t.createdAt),
  })
}

/**
 * Get a single skill set by slug
 */
export async function getSkillSet(
  projectId: string,
  slug: string,
): Promise<SkillSet | null> {
  const skillSet = await db.query.skillSets.findFirst({
    columns: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
    },
    where: (t, { eq, and }) =>
      and(eq(t.slug, slug), eq(t.projectId, projectId)),
  })

  return skillSet ?? null
}

/**
 * Create a new skill set
 */
export async function createSkillSet(
  projectId: string,
  data: { name: string; slug: string },
): Promise<ReturnResult<{ id: string }>> {
  try {
    const [skillSet] = await db
      .insert(skillSets)
      .values({
        projectId,
        name: data.name,
        slug: data.slug,
      })
      .returning({ id: skillSets.id })

    return ok({ id: skillSet.id })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('skill_sets_project_id_slug_unique')
    ) {
      return err(
        new ConflictError(
          'A skill set with this slug already exists in this project',
        ),
      )
    }
    throw error
  }
}

/**
 * Update a skill set by id
 */
export async function updateSkillSet(
  skillSetId: string,
  data: { name?: string; slug?: string },
): Promise<ReturnResult<SkillSet>> {
  try {
    const [updated] = await db
      .update(skillSets)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(skillSets.id, skillSetId))
      .returning({
        id: skillSets.id,
        name: skillSets.name,
        slug: skillSets.slug,
        createdAt: skillSets.createdAt,
        updatedAt: skillSets.updatedAt,
      })

    return ok(updated)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('skill_sets_project_id_slug_unique')
    ) {
      return err(
        new ConflictError(
          'A skill set with this slug already exists in this project',
        ),
      )
    }
    throw error
  }
}

/**
 * Delete a skill set by id
 */
export async function deleteSkillSet(skillSetId: string): Promise<void> {
  await db.delete(skillSets).where(eq(skillSets.id, skillSetId))
}
