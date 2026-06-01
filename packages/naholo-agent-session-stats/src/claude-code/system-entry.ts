import { z } from 'zod'
import type { ClaudeCodeTranscriptEntryBase, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

export interface ClaudeCodeSystemEntry extends ClaudeCodeTranscriptEntryBase {
  type: 'system'
}

const systemRowSchema = z
  .object({
    type: z.literal('system'),
    timestamp: z.string(),
    subtype: z.unknown().optional(),
    content: z.string().optional(),
    isMeta: z.boolean().optional(),
    level: z.unknown().optional(),
    hasOutput: z.unknown().optional(),
    hookCount: z.unknown().optional(),
    hookErrors: z.unknown().optional(),
    hookInfos: z.unknown().optional(),
    preventedContinuation: z.unknown().optional(),
    stopReason: z.unknown().optional(),
    toolUseID: z.unknown().optional(),
    error: z.looseObject({}).nullable().optional(),
    retryInMs: z.number().optional(),
    retryAttempt: z.number().int().optional(),
    maxRetries: z.number().int().optional(),
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

export const mapSystemEntry: TranscriptMapper = (raw, ctx) => {
  const parsed = systemRowSchema.safeParse(raw)
  if (!parsed.success) {
    throw mapValidationError(parsed.error, ctx.index)
  }
  const entry: ClaudeCodeSystemEntry = {
    index: ctx.index,
    type: 'system',
    timestamp: parsed.data.timestamp,
    raw,
  }
  return entry
}
