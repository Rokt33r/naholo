import { z } from 'zod'
import type { ClaudeCodeTranscriptEntryBase, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

export interface ClaudeCodeUserEntry extends ClaudeCodeTranscriptEntryBase {
  type: 'user'
}

const userRowSchema = z
  .object({
    type: z.literal('user'),
    timestamp: z.string(),
    message: z
      .object({
        role: z.unknown().optional(),
        content: z
          .union([
            z.string(),
            z.array(
              z.discriminatedUnion('type', [
                z.object({
                  type: z.literal('text'),
                  text: z.string().optional(),
                }),
                z.object({
                  type: z.literal('tool_use'),
                  name: z.string().optional(),
                }),
                z.object({ type: z.literal('tool_result') }),
              ]),
            ),
          ])
          .optional(),
      })
      .strict(),
    parentUuid: z.unknown().optional(),
    isSidechain: z.unknown().optional(),
    isMeta: z.unknown().optional(),
    permissionMode: z.unknown().optional(),
    promptId: z.unknown().optional(),
    sourceToolAssistantUUID: z.unknown().optional(),
    toolUseResult: z.unknown().optional(),
    cwd: z.unknown().optional(),
    entrypoint: z.unknown().optional(),
    gitBranch: z.unknown().optional(),
    slug: z.string().optional(),
    sessionId: z.unknown().optional(),
    userType: z.unknown().optional(),
    uuid: z.unknown().optional(),
    version: z.unknown().optional(),
  })
  .strict()

export const mapUserEntry: TranscriptMapper = (raw, ctx) => {
  const parsed = userRowSchema.safeParse(raw)
  if (!parsed.success) {
    throw mapValidationError(parsed.error, ctx.index)
  }
  const entry: ClaudeCodeUserEntry = {
    index: ctx.index,
    type: 'user',
    timestamp: parsed.data.timestamp,
    raw,
  }
  return entry
}
