import { Command } from 'commander'
import { getCliContext } from '../context.js'
import {
  readPulledSkill,
  removePulledSkill,
  writeConflictMarkers,
  backupPulledSkill,
  getPulledSkillPath,
} from '../skills.js'
import type { Skill } from 'naholo-api/types'

async function fetchServerSkill(
  client: ReturnType<typeof getCliContext>['client'],
  projectId: string,
  skillName: string,
): Promise<Skill | null> {
  try {
    return await client.getSkill(projectId, skillName)
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null
    }
    throw error
  }
}

function contentEquals(a: string, b: string): boolean {
  return a.trim() === b.trim()
}

export const pushCommand = new Command('push')
  .description('Push local skill changes to the server')
  .argument('<skill-name>', 'name of the skill to push')
  .action(async (skillName: string) => {
    const ctx = getCliContext()
    const { client, projectConfig } = ctx
    const projectId = projectConfig.projectId

    // 1. Read local pulled skill
    const local = readPulledSkill(skillName)
    if (local == null) {
      console.error(`Skill "${skillName}" is not pulled locally.`)
      process.exit(1)
    }

    // 2. Check for conflicted state
    if (local.meta.conflicted) {
      console.error(
        `Skill "${skillName}" has unresolved conflicts. Resolve the conflict and remove "conflicted: true" from the frontmatter before pushing.`,
      )
      process.exit(1)
    }

    // 3. Fetch server skill by name
    const serverSkill = await fetchServerSkill(client, projectId, skillName)

    const hasRevisionId = local.meta.revisionId != null

    if (serverSkill == null) {
      console.error(
        `Skill "${skillName}" has been deleted on the server. Cannot push.`,
      )
      process.exit(1)
    }

    if (!hasRevisionId) {
      // --- No revisionId cases ---
      if (contentEquals(local.content, serverSkill.content)) {
        // Same content — no-op
        removePulledSkill(skillName)
        console.log(`"${skillName}" is already up to date.`)
        return
      }

      // Different content — conflict
      const backupPath = backupPulledSkill(skillName)
      console.log(`  Backed up local version to: ${backupPath}`)
      writeConflictMarkers(
        skillName,
        local.content,
        serverSkill.content,
        serverSkill.currentRevisionId!,
      )
      console.log(
        `Conflict detected for "${skillName}". Review the file and remove "conflicted: true" when resolved:`,
      )
      console.log(`  ${getPulledSkillPath(skillName)}`)
      return
    }

    // --- Has revisionId cases ---
    if (local.meta.revisionId === serverSkill.currentRevisionId) {
      // Matching revisionId — push update
      try {
        await client.updateSkill(projectId, skillName, {
          content: local.content,
          expectedRevisionId: local.meta.revisionId,
        })
        removePulledSkill(skillName)
        console.log(`Pushed "${skillName}" successfully.`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('409')) {
          // Race condition — re-fetch and write conflict
          const freshServer = await fetchServerSkill(
            client,
            projectId,
            skillName,
          )
          if (freshServer != null) {
            const backupPath = backupPulledSkill(skillName)
            console.log(`  Backed up local version to: ${backupPath}`)
            writeConflictMarkers(
              skillName,
              local.content,
              freshServer.content,
              freshServer.currentRevisionId!,
            )
            console.log(
              `Conflict detected for "${skillName}". Review the file and remove "conflicted: true" when resolved:`,
            )
            console.log(`  ${getPulledSkillPath(skillName)}`)
          }
        } else {
          throw error
        }
      }
      return
    }

    // Non-matching revisionId
    if (contentEquals(local.content, serverSkill.content)) {
      // Same content — no-op
      removePulledSkill(skillName)
      console.log(`"${skillName}" is already up to date.`)
      return
    }

    // Different content — 2-way conflict (no base revision API yet)
    const backupPath = backupPulledSkill(skillName)
    console.log(`  Backed up local version to: ${backupPath}`)
    writeConflictMarkers(
      skillName,
      local.content,
      serverSkill.content,
      serverSkill.currentRevisionId!,
    )
    console.log(
      `Conflict detected for "${skillName}". Review the file and remove "conflicted: true" when resolved:`,
    )
    console.log(`  ${getPulledSkillPath(skillName)}`)
  })
