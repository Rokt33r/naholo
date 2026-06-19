import { z } from 'zod'
import type { ClaudeCodeTranscriptEntry, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

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
    slug: z.string().optional(),
    sessionId: z.unknown().optional(),
    userType: z.unknown().optional(),
    uuid: z.unknown().optional(),
    version: z.unknown().optional(),
  })
  .strict()

export type ClaudeCodeAttachmentData = z.infer<typeof attachmentRowSchema>

export type ClaudeCodeAttachmentEntry = ClaudeCodeTranscriptEntry<
  'attachment',
  ClaudeCodeAttachmentData
>

export const mapAttachmentEntry: TranscriptMapper = (rawJson, rawLine, ctx) => {
  const parsed = attachmentRowSchema.safeParse(rawJson)
  if (!parsed.success) {
    const entry: ClaudeCodeAttachmentEntry = {
      type: 'attachment',
      lineNumber: ctx.lineNumber,
      data: null,
      raw: rawLine,
      errors: [mapValidationError(parsed.error)],
      modelUsages: [],
    }
    return entry
  }
  const entry: ClaudeCodeAttachmentEntry = {
    type: 'attachment',
    lineNumber: ctx.lineNumber,
    data: parsed.data,
    raw: rawLine,
    errors: [],
    modelUsages: [],
  }
  return entry
}
