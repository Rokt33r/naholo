import { z } from 'zod'
import type { ClaudeCodeTranscriptEntry, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

const fileHistorySnapshotRowSchema = z
  .object({
    type: z.literal('file-history-snapshot'),
    messageId: z.unknown().optional(),
    snapshot: z.unknown().optional(),
    isSnapshotUpdate: z.unknown().optional(),
  })
  .strict()

export type ClaudeCodeFileHistorySnapshotData = z.infer<
  typeof fileHistorySnapshotRowSchema
>

export type ClaudeCodeFileHistorySnapshotEntry = ClaudeCodeTranscriptEntry<
  'file-history-snapshot',
  ClaudeCodeFileHistorySnapshotData
>

export const mapFileHistorySnapshotEntry: TranscriptMapper = (
  rawJson,
  rawLine,
  ctx,
) => {
  const parsed = fileHistorySnapshotRowSchema.safeParse(rawJson)
  if (!parsed.success) {
    const entry: ClaudeCodeFileHistorySnapshotEntry = {
      type: 'file-history-snapshot',
      data: null,
      raw: rawLine,
      errors: [mapValidationError(parsed.error, ctx.index)],
      modelUsages: [],
    }
    return entry
  }
  const entry: ClaudeCodeFileHistorySnapshotEntry = {
    type: 'file-history-snapshot',
    data: parsed.data,
    raw: rawLine,
    errors: [],
    modelUsages: [],
  }
  return entry
}
