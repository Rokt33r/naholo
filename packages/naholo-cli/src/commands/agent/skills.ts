import { Command } from 'commander'
import { coreSkills } from '../../core-skills'
import { CliError, withErrorHandling } from '../../errors'
import { splitSkill } from '../../skills'

export const skillsCommand = new Command('skills')
  .description('Print the body of a bundled core skill')
  .argument('<name>', 'Skill name (e.g. infil, warno, splash)')
  .action(
    withErrorHandling(async (name: string) => {
      const skill = coreSkills.find((s) => s.name === name)
      if (skill == null) {
        const available = coreSkills.map((s) => s.name).join(', ')
        throw new CliError(
          `Unknown skill: ${name}. Available skills: ${available}`,
        )
      }
      const { body } = splitSkill(skill.content)
      console.log(body)
    }),
  )
