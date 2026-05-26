import { z } from 'zod'
import type { ClaudeCodeTranscriptEntryBase, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

export interface ClaudeCodeAttachmentEntry
  extends ClaudeCodeTranscriptEntryBase {
  type: 'attachment'
}

const attachmentRowSchema = z.object({
  type: z.literal('attachment'),
  timestamp: z.string().optional(),
})

export const mapAttachmentEntry: TranscriptMapper = (raw, ctx) => {
  const parsed = attachmentRowSchema.safeParse(raw)
  if (!parsed.success) {
    throw mapValidationError(parsed.error, ctx.index)
  }
  const entry: ClaudeCodeAttachmentEntry = {
    index: ctx.index,
    type: 'attachment',
    timestamp: parsed.data.timestamp ?? null,
    raw,
  }
  return entry
}
