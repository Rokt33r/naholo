import { z } from 'zod'
import type { ClaudeCodeTranscriptEntryBase, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

export interface ClaudeCodeAiTitleEntry extends ClaudeCodeTranscriptEntryBase {
  type: 'ai-title'
}

const aiTitleRowSchema = z.object({
  type: z.literal('ai-title'),
  timestamp: z.string().optional(),
})

export const mapAiTitleEntry: TranscriptMapper = (raw, ctx) => {
  const parsed = aiTitleRowSchema.safeParse(raw)
  if (!parsed.success) {
    throw mapValidationError(parsed.error, ctx.index)
  }
  const entry: ClaudeCodeAiTitleEntry = {
    index: ctx.index,
    type: 'ai-title',
    timestamp: parsed.data.timestamp ?? null,
    raw,
  }
  return entry
}
