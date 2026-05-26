import { z } from 'zod'
import type { ClaudeCodeTranscriptEntryBase, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

export interface ClaudeCodeSystemEntry extends ClaudeCodeTranscriptEntryBase {
  type: 'system'
}

const systemRowSchema = z.object({
  type: z.literal('system'),
  timestamp: z.string().optional(),
})

export const mapSystemEntry: TranscriptMapper = (raw, ctx) => {
  const parsed = systemRowSchema.safeParse(raw)
  if (!parsed.success) {
    throw mapValidationError(parsed.error, ctx.index)
  }
  const entry: ClaudeCodeSystemEntry = {
    index: ctx.index,
    type: 'system',
    timestamp: parsed.data.timestamp ?? null,
    raw,
  }
  return entry
}
