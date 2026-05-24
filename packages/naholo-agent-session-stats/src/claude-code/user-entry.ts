import { z } from 'zod'
import type {
  ClaudeCodeTranscriptEntryBase,
  TranscriptMapper,
} from './types.js'
import { mapValidationError } from './utils.js'

export interface ClaudeCodeUserEntry extends ClaudeCodeTranscriptEntryBase {
  type: 'user'
}

const userRowSchema = z.object({
  type: z.literal('user'),
  timestamp: z.string().optional(),
  message: z.object({
    content: z
      .union([
        z.string(),
        z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('text'), text: z.string().optional() }),
            z.object({
              type: z.literal('tool_use'),
              name: z.string().optional(),
            }),
            z.object({ type: z.literal('tool_result') }),
          ]),
        ),
      ])
      .optional(),
  }),
})

export const mapUserEntry: TranscriptMapper = (raw, ctx) => {
  const parsed = userRowSchema.safeParse(raw)
  if (!parsed.success) {
    throw mapValidationError(parsed.error, ctx.index)
  }
  const entry: ClaudeCodeUserEntry = {
    index: ctx.index,
    type: 'user',
    timestamp: parsed.data.timestamp ?? null,
    raw,
  }
  return entry
}
