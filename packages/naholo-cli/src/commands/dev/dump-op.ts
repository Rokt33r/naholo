import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import { NaholoClient } from 'naholo-api/client'
import { CliError, withErrorHandling } from '../../errors.js'
import { readGlobalConfig } from '../../global-config.js'
import { getActiveProfile } from '../../profile.js'

export const dumpOpCommand = new Command('dump-op')
  .description(
    'Dump an operation (metadata + agent sessions + transcripts) to a directory',
  )
  .argument(
    '<projSlugAndNumber>',
    'Source operation as "{projectSlug}/{operationNumber}"',
  )
  .argument('<dumpDir>', 'Destination directory for the bundle')
  .action(
    withErrorHandling(async (projSlugAndNumber: string, dumpDir: string) => {
      const { projectSlug, operationNumber } =
        parseSlugAndNumber(projSlugAndNumber)

      const globalConfig = readGlobalConfig()
      const active = getActiveProfile(globalConfig.defaultProfile)
      if (active == null) {
        throw new CliError('Not logged in. Run "naholo login" to authenticate.')
      }
      const client = new NaholoClient({
        baseUrl: active.profile.baseUrl,
        token: active.profile.token,
      })

      const operation = await client.getOperation(projectSlug, operationNumber)
      const sessions = await client.listAgentSessions(
        projectSlug,
        operationNumber,
      )

      const absDumpDir = path.resolve(dumpDir)
      fs.mkdirSync(absDumpDir, { recursive: true })
      const transcriptsDir = path.join(absDumpDir, 'transcripts')
      fs.mkdirSync(transcriptsDir, { recursive: true })

      fs.writeFileSync(
        path.join(absDumpDir, 'operation.json'),
        JSON.stringify({
          number: operation.number,
          title: operation.title,
          projectSlug,
        }),
      )

      fs.writeFileSync(
        path.join(absDumpDir, 'sessions.json'),
        JSON.stringify(sessions),
      )

      let transcriptCount = 0
      for (const session of sessions) {
        if (!session.hasTranscript) {
          continue
        }
        const text = await client.getAgentSessionTranscript(
          projectSlug,
          operationNumber,
          session.id,
        )
        fs.writeFileSync(
          path.join(transcriptsDir, `${session.sessionId}.jsonl`),
          text,
        )
        transcriptCount += 1
      }

      console.log(
        `Dumped ${projectSlug}/#${operation.number} "${operation.title}" → ${absDumpDir}`,
      )
      console.log(
        `  ${sessions.length} session(s), ${transcriptCount} transcript(s)`,
      )
    }),
  )

function parseSlugAndNumber(value: string): {
  projectSlug: string
  operationNumber: number
} {
  const slashIndex = value.lastIndexOf('/')
  if (slashIndex <= 0 || slashIndex === value.length - 1) {
    throw new CliError(
      'Expected "{projectSlug}/{operationNumber}" — got "' + value + '"',
    )
  }
  const projectSlug = value.slice(0, slashIndex)
  const numberPart = value.slice(slashIndex + 1)
  const operationNumber = Number(numberPart)
  if (!Number.isInteger(operationNumber) || operationNumber <= 0) {
    throw new CliError(
      `Operation number must be a positive integer, got "${numberPart}"`,
    )
  }

  return { projectSlug, operationNumber }
}
