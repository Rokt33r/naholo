import { z } from 'zod'
import type { ClaudeCodeTranscriptEntry, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

const lastPromptRowSchema = z
  .object({
    type: z.literal('last-prompt'),
    lastPrompt: z.unknown().optional(),
    leafUuid: z.unknown().optional(),
    sessionId: z.unknown().optional(),
  })
  .strict()

export type ClaudeCodeLastPromptData = z.infer<typeof lastPromptRowSchema>

export type ClaudeCodeLastPromptEntry = ClaudeCodeTranscriptEntry<
  'last-prompt',
  ClaudeCodeLastPromptData
>

export const mapLastPromptEntry: TranscriptMapper = (rawJson, rawLine, ctx) => {
  const parsed = lastPromptRowSchema.safeParse(rawJson)
  if (!parsed.success) {
    const entry: ClaudeCodeLastPromptEntry = {
      type: 'last-prompt',
      data: null,
      raw: rawLine,
      errors: [mapValidationError(parsed.error, ctx.index)],
      modelUsages: [],
    }
    return entry
  }
  const entry: ClaudeCodeLastPromptEntry = {
    type: 'last-prompt',
    data: parsed.data,
    raw: rawLine,
    errors: [],
    modelUsages: [],
  }
  return entry
}
