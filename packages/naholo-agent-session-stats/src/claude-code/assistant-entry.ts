import { z } from 'zod'
import type {
  ClaudeCodeTokenUsage,
  ClaudeCodeTranscriptEntryBase,
  TranscriptMapper,
} from './types.js'
import { mapValidationError } from './utils.js'

export interface ClaudeCodeAssistantEntry
  extends ClaudeCodeTranscriptEntryBase {
  type: 'assistant'
  messageId: string
  model: string
  attributionSkill: string | null
  toolUses: string[]
  usage: ClaudeCodeTokenUsage
}

const assistantRowSchema = z.object({
  type: z.literal('assistant'),
  timestamp: z.string().optional(),
  attributionSkill: z.string().optional(),
  message: z.object({
    id: z.string(),
    model: z.string(),
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
    usage: z
      .object({
        input_tokens: z.number().int().nonnegative(),
        output_tokens: z.number().int().nonnegative(),
        cache_creation: z.object({
          ephemeral_5m_input_tokens: z.number().int().nonnegative(),
          ephemeral_1h_input_tokens: z.number().int().nonnegative(),
        }),
        cache_read_input_tokens: z.number().int().nonnegative(),
        cache_creation_input_tokens: z.unknown().optional(),
        service_tier: z.unknown().optional(),
        server_tool_use: z.unknown().optional(),
      })
      .strict(),
  }),
})

export const mapAssistantEntry: TranscriptMapper = (raw, ctx) => {
  const parsed = assistantRowSchema.safeParse(raw)
  if (!parsed.success) {
    throw mapValidationError(parsed.error, ctx.index)
  }
  const row = parsed.data
  const u = row.message.usage
  const entry: ClaudeCodeAssistantEntry = {
    index: ctx.index,
    type: 'assistant',
    timestamp: row.timestamp ?? null,
    raw,
    messageId: row.message.id,
    model: row.message.model,
    attributionSkill:
      row.attributionSkill != null && row.attributionSkill.length > 0
        ? row.attributionSkill
        : null,
    toolUses: extractToolUses(row.message.content),
    usage: {
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheCreation5mInputTokens: u.cache_creation.ephemeral_5m_input_tokens,
      cacheCreation1hInputTokens: u.cache_creation.ephemeral_1h_input_tokens,
      cacheReadInputTokens: u.cache_read_input_tokens,
    },
  }
  return entry
}

function extractToolUses(
  content: z.infer<typeof assistantRowSchema>['message']['content'],
): string[] {
  if (content == null || typeof content === 'string') {
    return []
  }
  const toolUses: string[] = []
  for (const part of content) {
    if (part.type === 'tool_use' && part.name != null && part.name.length > 0) {
      toolUses.push(part.name)
    }
  }
  return toolUses
}
