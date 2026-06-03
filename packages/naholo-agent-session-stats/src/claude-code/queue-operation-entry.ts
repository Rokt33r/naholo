import { z } from 'zod'
import type { ClaudeCodeTranscriptEntry, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

const queueOperationRowSchema = z
  .object({
    type: z.literal('queue-operation'),
    timestamp: z.string(),
    operation: z.unknown().optional(),
    sessionId: z.unknown().optional(),
  })
  .strict()

export type ClaudeCodeQueueOperationData = z.infer<
  typeof queueOperationRowSchema
>

export type ClaudeCodeQueueOperationEntry = ClaudeCodeTranscriptEntry<
  'queue-operation',
  ClaudeCodeQueueOperationData
>

export const mapQueueOperationEntry: TranscriptMapper = (
  rawJson,
  rawLine,
  ctx,
) => {
  const parsed = queueOperationRowSchema.safeParse(rawJson)
  if (!parsed.success) {
    const entry: ClaudeCodeQueueOperationEntry = {
      type: 'queue-operation',
      lineNumber: ctx.lineNumber,
      data: null,
      raw: rawLine,
      errors: [mapValidationError(parsed.error)],
      modelUsages: [],
    }
    return entry
  }
  const entry: ClaudeCodeQueueOperationEntry = {
    type: 'queue-operation',
    lineNumber: ctx.lineNumber,
    data: parsed.data,
    raw: rawLine,
    errors: [],
    modelUsages: [],
  }
  return entry
}
