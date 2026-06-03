import { z } from 'zod'
import type { ClaudeCodeTranscriptEntry, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

const aiTitleRowSchema = z
  .object({
    type: z.literal('ai-title'),
    aiTitle: z.unknown().optional(),
    sessionId: z.unknown().optional(),
  })
  .strict()

export type ClaudeCodeAiTitleData = z.infer<typeof aiTitleRowSchema>

export type ClaudeCodeAiTitleEntry = ClaudeCodeTranscriptEntry<
  'ai-title',
  ClaudeCodeAiTitleData
>

export const mapAiTitleEntry: TranscriptMapper = (rawJson, rawLine, ctx) => {
  const parsed = aiTitleRowSchema.safeParse(rawJson)
  if (!parsed.success) {
    const entry: ClaudeCodeAiTitleEntry = {
      type: 'ai-title',
      lineNumber: ctx.lineNumber,
      data: null,
      raw: rawLine,
      errors: [mapValidationError(parsed.error)],
      modelUsages: [],
    }
    return entry
  }
  const entry: ClaudeCodeAiTitleEntry = {
    type: 'ai-title',
    lineNumber: ctx.lineNumber,
    data: parsed.data,
    raw: rawLine,
    errors: [],
    modelUsages: [],
  }
  return entry
}
