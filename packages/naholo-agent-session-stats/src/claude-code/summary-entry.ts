import { z } from 'zod'
import type { ClaudeCodeTranscriptEntry, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

const summaryRowSchema = z
  .object({
    type: z.literal('summary'),
    summary: z.string(),
    timestamp: z.string().optional(),
  })
  .strict()

export type ClaudeCodeSummaryData = z.infer<typeof summaryRowSchema>

export type ClaudeCodeSummaryEntry = ClaudeCodeTranscriptEntry<
  'summary',
  ClaudeCodeSummaryData
>

export const mapSummaryEntry: TranscriptMapper = (rawJson, rawLine, ctx) => {
  const parsed = summaryRowSchema.safeParse(rawJson)
  if (!parsed.success) {
    const entry: ClaudeCodeSummaryEntry = {
      type: 'summary',
      data: null,
      raw: rawLine,
      errors: [mapValidationError(parsed.error, ctx.index)],
      modelUsages: [],
    }
    return entry
  }
  const entry: ClaudeCodeSummaryEntry = {
    type: 'summary',
    data: parsed.data,
    raw: rawLine,
    errors: [],
    modelUsages: [],
  }
  return entry
}
