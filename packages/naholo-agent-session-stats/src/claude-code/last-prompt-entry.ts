import { z } from 'zod'
import type { ClaudeCodeTranscriptEntryBase, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

export interface ClaudeCodeLastPromptEntry
  extends ClaudeCodeTranscriptEntryBase {
  type: 'last-prompt'
}

const lastPromptRowSchema = z.object({
  type: z.literal('last-prompt'),
  timestamp: z.string().optional(),
})

export const mapLastPromptEntry: TranscriptMapper = (raw, ctx) => {
  const parsed = lastPromptRowSchema.safeParse(raw)
  if (!parsed.success) {
    throw mapValidationError(parsed.error, ctx.index)
  }
  const entry: ClaudeCodeLastPromptEntry = {
    index: ctx.index,
    type: 'last-prompt',
    timestamp: parsed.data.timestamp ?? null,
    raw,
  }
  return entry
}
