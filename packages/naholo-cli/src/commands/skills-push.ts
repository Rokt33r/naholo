import confirm from '@inquirer/confirm'
import { Command } from 'commander'
import { getCliContext } from '../context.js'
import {
  readPulledSkill,
  removePulledSkill,
  backupPulledSkill,
  writeConflictMarkers,
  getPulledSkillPath,
} from '../skills.js'

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

    // 3. Look up skill ID
    const skillId = projectConfig.skillAliasRecord?.[skillName]
    if (skillId == null) {
      console.error(
        `Skill "${skillName}" not found in aliases. Run "naholo skills sync-alias" first.`,
      )
      process.exit(1)
    }

    // 4. Fetch current revisionId from server
    const serverSkill = await client.getSkill(projectId, skillId)

    // 5. Check if matching
    if (local.meta.revisionId === serverSkill.currentRevisionId) {
      // Push update
      try {
        await client.updateSkill(projectId, skillId, {
          content: local.content,
          expectedRevisionId: local.meta.revisionId,
        })
        removePulledSkill(skillName)
        console.log(`Pushed "${skillName}" successfully.`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('409')) {
          console.error(
            'Conflict detected during push. Another update happened concurrently.',
          )
          process.exit(1)
        }
        throw error
      }
      return
    }

    // 6. Conflict — server has a different revision
    const resolveNow = await confirm({
      message: `Skill "${skillName}" has been updated on the server since you pulled. Resolve conflict now?`,
      default: true,
    })

    if (!resolveNow) {
      console.log('Aborted.')
      return
    }

    // Backup local version and write conflict markers for manual resolution
    const backupPath = backupPulledSkill(skillName)
    console.log(`  Backed up local version to: ${backupPath}`)

    writeConflictMarkers(
      skillName,
      skillId,
      local.content,
      serverSkill.content,
      serverSkill.currentRevisionId!,
    )
    console.log(
      `Conflict detected for "${skillName}". Review the file and remove "conflicted: true" when resolved:`,
    )
    console.log(`  ${getPulledSkillPath(skillName)}`)
  })
