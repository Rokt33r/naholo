import confirm from '@inquirer/confirm'
import { Command } from 'commander'
import { getCliContext } from '../context.js'
import {
  readPulledSkill,
  writePulledSkill,
  backupPulledSkill,
  writeConflictMarkers,
  getPulledSkillPath,
} from '../skills.js'

export const pullCommand = new Command('pull')
  .description('Pull a skill for local editing')
  .argument('<skill-name>', 'name of the skill to pull')
  .action(async (skillName: string) => {
    const ctx = getCliContext()
    const { client, projectConfig } = ctx
    const projectId = projectConfig.projectId

    // 1. Fetch skill from server by name
    let serverSkill
    try {
      serverSkill = await client.getSkill(projectId, skillName)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('404')) {
        console.error(`Skill "${skillName}" not found on the server.`)
        process.exit(1)
      }
      throw error
    }

    // 2. Check if already pulled locally
    const localSkill = readPulledSkill(skillName)

    if (localSkill != null) {
      if (localSkill.meta.conflicted) {
        console.error(
          `Skill "${skillName}" has unresolved conflicts. Resolve the conflict and remove "conflicted: true" from the frontmatter before pulling.`,
        )
        process.exit(1)
      }

      if (localSkill.meta.revisionId === serverSkill.currentRevisionId) {
        console.log(`"${skillName}" is already up to date.`)
        return
      }

      // Server has a different revision — confirm before overwriting
      const resolveNow = await confirm({
        message: `Skill "${skillName}" has a newer version on the server. Resolve conflict now?`,
        default: true,
      })
      if (!resolveNow) {
        console.log('Aborted.')
        return
      }

      const backupPath = backupPulledSkill(skillName)
      console.log(`  Backed up local version to: ${backupPath}`)

      writeConflictMarkers(
        skillName,
        localSkill.content,
        serverSkill.content,
        serverSkill.currentRevisionId!,
      )
      console.log(
        `Conflict detected for "${skillName}". Review the file and remove "conflicted: true" when resolved:`,
      )
      console.log(`  ${getPulledSkillPath(skillName)}`)
      return
    }

    // 3. Not pulled yet — write fresh
    if (serverSkill.currentRevisionId == null) {
      console.error(`Skill "${skillName}" has no revisions on the server.`)
      process.exit(1)
    }

    writePulledSkill(
      skillName,
      { revisionId: serverSkill.currentRevisionId },
      serverSkill.content,
    )

    console.log(
      `Pulled "${skillName}" (revision: ${serverSkill.currentRevisionId})`,
    )
  })
