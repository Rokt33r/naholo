import { z } from 'zod'
import type { ClaudeCodeTranscriptEntryBase, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

export interface ClaudeCodeFileHistorySnapshotEntry
  extends ClaudeCodeTranscriptEntryBase {
  type: 'file-history-snapshot'
}

const fileHistorySnapshotRowSchema = z
  .object({
    type: z.literal('file-history-snapshot'),
    messageId: z.unknown().optional(),
    snapshot: z.unknown().optional(),
    isSnapshotUpdate: z.unknown().optional(),
  })
  .strict()

export const mapFileHistorySnapshotEntry: TranscriptMapper = (raw, ctx) => {
  const parsed = fileHistorySnapshotRowSchema.safeParse(raw)
  if (!parsed.success) {
    throw mapValidationError(parsed.error, ctx.index)
  }
  const entry: ClaudeCodeFileHistorySnapshotEntry = {
    index: ctx.index,
    type: 'file-history-snapshot',
    timestamp: null,
    raw,
  }
  return entry
}
