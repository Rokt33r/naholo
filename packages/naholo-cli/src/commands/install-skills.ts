import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import select from '@inquirer/select'
import { coreSkills } from '../core-skills.js'
import { CliError, withErrorHandling } from '../errors.js'
import { getProjectState } from '../lib/project-state.js'
import {
  getGlobalSkillsDir,
  getProjectSkillsDir,
  splitSkill,
  writeSkillFile,
} from '../skills.js'

export const installSkillsCommand = new Command('install-skills')
  .description(
    'Install bundled core skills (auto-targets global in covert projects; override with --target)',
  )
  .option(
    '--target <target>',
    'install target: "global" (~/.claude/skills) or "project" (.claude/skills); defaults to the project context',
  )
  .action(
    withErrorHandling(async (options: { target?: string }) => {
      const global = resolveGlobalTarget(options.target)
      await installSkills(coreSkills, { global })
    }),
  )

export async function installSkills(
  skills: { name: string; content: string }[],
  opts: { global?: boolean } = {},
): Promise<void> {
  const baseDir =
    opts.global === true ? getGlobalSkillsDir() : getProjectSkillsDir()
  let overwriteAll = false
  let skipAll = false

  for (const skill of skills) {
    const skillPath = path.join(baseDir, skill.name, 'SKILL.md')
    const exists = fs.existsSync(skillPath)
    const { frontmatter } = splitSkill(skill.content)
    const stub = `${frontmatter}\nRun \`naholo agent skills ${skill.name}\` and follow stdout.\n`

    if (!exists) {
      writeSkillFile(skill.name, stub, baseDir)
      console.log(`  Created: ${skill.name}`)
      continue
    }

    if (overwriteAll) {
      writeSkillFile(skill.name, stub, baseDir)
      console.log(`  Overwritten: ${skill.name}`)
      continue
    }

    if (skipAll) {
      console.log(`  Skipped: ${skill.name}`)
      continue
    }

    const answer = await select({
      message: `Overwrite ${skill.name}?`,
      choices: [
        { name: 'Yes', value: 'yes' },
        { name: 'No', value: 'no' },
        { name: 'Yes to all', value: 'all' },
        { name: 'No to all', value: 'skip-all' },
      ],
      default: 'no',
    })

    if (answer === 'no') {
      console.log(`  Skipped: ${skill.name}`)
      continue
    }
    if (answer === 'skip-all') {
      skipAll = true
      console.log(`  Skipped: ${skill.name}`)
      continue
    }
    if (answer === 'all') {
      overwriteAll = true
    }

    writeSkillFile(skill.name, stub, baseDir)
    console.log(`  Overwritten: ${skill.name}`)
  }
}

function resolveGlobalTarget(target: string | undefined): boolean {
  if (target === 'global') {
    return true
  }
  if (target === 'project') {
    return false
  }
  if (target != null) {
    throw new CliError(
      `Invalid --target "${target}". Use "global" or "project".`,
    )
  }
  const projectState = getProjectState(process.cwd())
  return projectState?.kind === 'covert'
}
