import { z } from 'zod'
import type { ClaudeCodeTranscriptEntryBase, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

export interface ClaudeCodeAttachmentEntry
  extends ClaudeCodeTranscriptEntryBase {
  type: 'attachment'
}

const attachmentRowSchema = z
  .object({
    type: z.literal('attachment'),
    timestamp: z.string(),
    attachment: z.unknown().optional(),
    parentUuid: z.unknown().optional(),
    isSidechain: z.unknown().optional(),
    cwd: z.unknown().optional(),
    entrypoint: z.unknown().optional(),
    gitBranch: z.unknown().optional(),
    sessionId: z.unknown().optional(),
    userType: z.unknown().optional(),
    uuid: z.unknown().optional(),
    version: z.unknown().optional(),
  })
  .strict()

export const mapAttachmentEntry: TranscriptMapper = (raw, ctx) => {
  const parsed = attachmentRowSchema.safeParse(raw)
  if (!parsed.success) {
    throw mapValidationError(parsed.error, ctx.index)
  }
  const entry: ClaudeCodeAttachmentEntry = {
    index: ctx.index,
    type: 'attachment',
    timestamp: parsed.data.timestamp,
    raw,
  }
  return entry
}
