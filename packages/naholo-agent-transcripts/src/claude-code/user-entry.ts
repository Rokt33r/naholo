import { z } from 'zod'
import type { ClaudeCodeTranscriptEntry, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

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

export type ClaudeCodeUserData = z.infer<typeof userRowSchema>

export type ClaudeCodeUserEntry = ClaudeCodeTranscriptEntry<
  'user',
  ClaudeCodeUserData
>

export const mapUserEntry: TranscriptMapper = (rawJson, rawLine, ctx) => {
  const parsed = userRowSchema.safeParse(rawJson)
  if (!parsed.success) {
    const entry: ClaudeCodeUserEntry = {
      type: 'user',
      lineNumber: ctx.lineNumber,
      data: null,
      raw: rawLine,
      errors: [mapValidationError(parsed.error)],
      modelUsages: [],
    }
    return entry
  }
  const entry: ClaudeCodeUserEntry = {
    type: 'user',
    lineNumber: ctx.lineNumber,
    data: parsed.data,
    raw: rawLine,
    errors: [],
    modelUsages: [],
  }
  return entry
}
