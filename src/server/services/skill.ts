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
  currentRevisionId: string | null
  createdAt: Date
  updatedAt: Date
}

export type Skill = SkillSummary & {
  content: string
}

/**
 * List skills for a loadout (ordered by name)
 * Excludes content — use getSkill for full content
 */
export async function listSkills(
  skillLoadoutId: string,
): Promise<SkillSummary[]> {
  return db.query.skills.findMany({
    columns: {
      id: true,
      name: true,
      currentRevisionId: true,
      createdAt: true,
      updatedAt: true,
    },
    where: (t, { eq }) => eq(t.skillLoadoutId, skillLoadoutId),
    orderBy: (t, { asc }) => asc(t.name),
  })
}

/**
 * Get a single skill with full content (by name)
 */
export async function getSkill(
  skillLoadoutId: string,
  name: string,
): Promise<Skill | null> {
  const skill = await db.query.skills.findFirst({
    columns: {
      id: true,
      name: true,
      content: true,
      currentRevisionId: true,
      createdAt: true,
      updatedAt: true,
    },
    where: (t, { eq, and }) =>
      and(eq(t.name, name), eq(t.skillLoadoutId, skillLoadoutId)),
  })

  return skill ?? null
}

/**
 * Upsert a skill — create if not exists, update content + create revision if exists.
 */
export async function upsertSkill(
  skillLoadoutId: string,
  data: { name: string; content: string },
): Promise<ReturnResult<{ id: string; currentRevisionId: string }>> {
  try {
    const result = await db.transaction(async (tx) => {
      const existing = await tx.query.skills.findFirst({
        columns: { id: true },
        where: (t, { eq, and }) =>
          and(eq(t.name, data.name), eq(t.skillLoadoutId, skillLoadoutId)),
      })

      if (existing != null) {
        // Update: create new revision and update skill
        const [revision] = await tx
          .insert(skillRevisions)
          .values({
            skillId: existing.id,
            content: data.content,
          })
          .returning({ id: skillRevisions.id })

        await tx
          .update(skills)
          .set({
            content: data.content,
            currentRevisionId: revision.id,
            updatedAt: new Date(),
          })
          .where(eq(skills.id, existing.id))

        return { id: existing.id, currentRevisionId: revision.id }
      }

      // Create: insert skill + initial revision
      const [skill] = await tx
        .insert(skills)
        .values({
          skillLoadoutId,
          name: data.name,
          content: data.content,
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

    return ok(result)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('skills_skill_loadout_id_name_unique')
    ) {
      return err(
        new ConflictError(
          'A skill with this name already exists in this skill loadout',
        ),
      )
    }
    throw error
  }
}

/**
 * Delete a skill (by name)
 */
export async function deleteSkill(
  skillLoadoutId: string,
  name: string,
): Promise<ReturnResult<undefined>> {
  const [skill] = await db
    .delete(skills)
    .where(
      and(eq(skills.name, name), eq(skills.skillLoadoutId, skillLoadoutId)),
    )
    .returning({ id: skills.id })

  if (skill == null) {
    return err(new NotFoundError('Skill'))
  }

  return ok()
}
