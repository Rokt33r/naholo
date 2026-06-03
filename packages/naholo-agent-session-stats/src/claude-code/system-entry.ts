import { z } from 'zod'
import type { ClaudeCodeTranscriptEntry, TranscriptMapper } from './types'
import { mapValidationError } from './utils'

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

export type ClaudeCodeSystemData = z.infer<typeof systemRowSchema>

export type ClaudeCodeSystemEntry = ClaudeCodeTranscriptEntry<
  'system',
  ClaudeCodeSystemData
>

export const mapSystemEntry: TranscriptMapper = (rawJson, rawLine, ctx) => {
  const parsed = systemRowSchema.safeParse(rawJson)
  if (!parsed.success) {
    const entry: ClaudeCodeSystemEntry = {
      type: 'system',
      data: null,
      raw: rawLine,
      errors: [mapValidationError(parsed.error, ctx.index)],
      modelUsages: [],
    }
    return entry
  }
  const entry: ClaudeCodeSystemEntry = {
    type: 'system',
    data: parsed.data,
    raw: rawLine,
    errors: [],
    modelUsages: [],
  }
  return entry
}
