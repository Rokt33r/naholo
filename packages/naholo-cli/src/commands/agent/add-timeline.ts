import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import { CliError, withErrorHandling } from '../../errors.js'
import { getNotesDir, readOpYml } from '../../lib/local-operations.js'

function formatLocalTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

export const addTimelineCommand = new Command('add-timeline')
  .description(
    "Append a bullet to the infiled operation's TIMELINE.md (skill-event log)",
  )
  .requiredOption(
    '-T, --type <type>',
    'Stage label written verbatim after the timestamp (e.g. "warno", "splash", "warno (resumed)")',
  )
  .argument('<contents>', 'Summary text written after the colon')
  .action(
    withErrorHandling(async (contents: string, options: { type: string }) => {
      const opYml = readOpYml()
      if (opYml == null) {
        throw new CliError(
          'No infiled operation. Run "naholo agent infil <n>" first.',
        )
      }

      const timelinePath = path.join(getNotesDir(), 'TIMELINE.md')
      if (!fs.existsSync(timelinePath)) {
        fs.mkdirSync(getNotesDir(), { recursive: true })
        fs.writeFileSync(timelinePath, `# TIMELINE — OP #${opYml.number}\n\n`)
      }

      const timestamp = formatLocalTimestamp(new Date())
      const bullet = `- ${timestamp} — ${options.type}: ${contents}\n`
      fs.appendFileSync(timelinePath, bullet)

      console.log(bullet.trimEnd())
    }),
  )
