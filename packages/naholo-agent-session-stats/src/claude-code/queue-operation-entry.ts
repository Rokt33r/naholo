import { z } from 'zod'
import type { ClaudeCodeTranscriptEntryBase, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

export interface ClaudeCodeQueueOperationEntry
  extends ClaudeCodeTranscriptEntryBase {
  type: 'queue-operation'
}

const queueOperationRowSchema = z
  .object({
    type: z.literal('queue-operation'),
    timestamp: z.string(),
    operation: z.unknown().optional(),
    sessionId: z.unknown().optional(),
  })
  .strict()

export const mapQueueOperationEntry: TranscriptMapper = (raw, ctx) => {
  const parsed = queueOperationRowSchema.safeParse(raw)
  if (!parsed.success) {
    throw mapValidationError(parsed.error, ctx.index)
  }
  const entry: ClaudeCodeQueueOperationEntry = {
    index: ctx.index,
    type: 'queue-operation',
    timestamp: parsed.data.timestamp,
    raw,
  }
  return entry
}
