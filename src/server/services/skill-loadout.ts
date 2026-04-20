import 'server-only'
import { db } from '../db'
import { skillLoadouts } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { ConflictError } from './errors'

export type SkillLoadoutSummary = {
  id: string
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}

export type SkillLoadout = SkillLoadoutSummary

/**
 * List skill loadouts for a project (ordered by createdAt asc)
 */
export async function listSkillLoadouts(
  projectId: string,
): Promise<SkillLoadoutSummary[]> {
  return db.query.skillLoadouts.findMany({
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
 * Get a single skill loadout by slug
 */
export async function getSkillLoadoutBySlug(
  projectId: string,
  slug: string,
): Promise<SkillLoadout | null> {
  const skillLoadout = await db.query.skillLoadouts.findFirst({
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

  return skillLoadout ?? null
}

/**
 * Create a new skill loadout
 */
export async function createSkillLoadout(
  projectId: string,
  data: { name: string; slug: string },
): Promise<ReturnResult<{ id: string }>> {
  try {
    const [skillLoadout] = await db
      .insert(skillLoadouts)
      .values({
        projectId,
        name: data.name,
        slug: data.slug,
      })
      .returning({ id: skillLoadouts.id })

    return ok({ id: skillLoadout.id })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('skill_loadouts_project_id_slug_unique')
    ) {
      return err(
        new ConflictError(
          'A skill loadout with this slug already exists in this project',
        ),
      )
    }
    throw error
  }
}

/**
 * Update a skill loadout by id
 */
export async function updateSkillLoadout(
  skillLoadoutId: string,
  data: { name?: string; slug?: string },
): Promise<ReturnResult<SkillLoadout>> {
  try {
    const [updated] = await db
      .update(skillLoadouts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(skillLoadouts.id, skillLoadoutId))
      .returning({
        id: skillLoadouts.id,
        name: skillLoadouts.name,
        slug: skillLoadouts.slug,
        createdAt: skillLoadouts.createdAt,
        updatedAt: skillLoadouts.updatedAt,
      })

    return ok(updated)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('skill_loadouts_project_id_slug_unique')
    ) {
      return err(
        new ConflictError(
          'A skill loadout with this slug already exists in this project',
        ),
      )
    }
    throw error
  }
}

/**
 * Delete a skill loadout by id
 */
export async function deleteSkillLoadout(
  skillLoadoutId: string,
): Promise<void> {
  await db.delete(skillLoadouts).where(eq(skillLoadouts.id, skillLoadoutId))
}
