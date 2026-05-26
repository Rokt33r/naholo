import { z } from 'zod'
import type { ClaudeCodeTranscriptEntryBase, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

export interface ClaudeCodeSummaryEntry extends ClaudeCodeTranscriptEntryBase {
  type: 'summary'
}

const summaryRowSchema = z
  .object({
    type: z.literal('summary'),
    summary: z.string(),
    timestamp: z.string().optional(),
  })
  .strict()

export const mapSummaryEntry: TranscriptMapper = (raw, ctx) => {
  const parsed = summaryRowSchema.safeParse(raw)
  if (!parsed.success) {
    throw mapValidationError(parsed.error, ctx.index)
  }
  const entry: ClaudeCodeSummaryEntry = {
    index: ctx.index,
    type: 'summary',
    timestamp: parsed.data.timestamp ?? null,
    raw,
  }
  return entry
}
