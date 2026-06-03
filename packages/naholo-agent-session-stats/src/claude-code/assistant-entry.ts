import { z } from 'zod'
import type {
  ClaudeCodeTranscriptEntry,
  ModelTokenUsage,
  TranscriptMapper,
} from './types'
import { mapValidationError } from './utils'

const usageBlockSchema = z
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
    inference_geo: z.unknown().optional(),
    iterations: z.unknown().optional(),
    speed: z.unknown().optional(),
  })
  .strict()

const assistantRowSchema = z
  .object({
    type: z.literal('assistant'),
    timestamp: z.string(),
    attributionSkill: z.string().optional(),
    requestId: z.unknown().optional(),
    error: z.string().optional(),
    isApiErrorMessage: z.boolean().optional(),
    apiErrorStatus: z.number().int().optional(),
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
    message: z
      .object({
        id: z.string(),
        model: z.string(),
        type: z.unknown().optional(),
        role: z.unknown().optional(),
        diagnostics: z.unknown().optional(),
        container: z.null().optional(),
        context_management: z.null().optional(),
        stop_details: z.unknown().optional(),
        stop_reason: z.unknown().optional(),
        stop_sequence: z.unknown().optional(),
        content: z
          .union([
            z.string(),
            z.array(
              z.discriminatedUnion('type', [
                z.object({
                  type: z.literal('text'),
                  text: z.string().optional(),
                }),
                z.object({
                  type: z.literal('thinking'),
                  thinking: z.string().optional(),
                }),
                z.object({
                  type: z.literal('tool_use'),
                  name: z.string().optional(),
                }),
                z.object({ type: z.literal('tool_result') }),
              ]),
            ),
          ])
          .optional(),
        usage: usageBlockSchema,
      })
      .strict(),
  })
  .strict()

const usageOnlyAssistantSchema = z.object({
  timestamp: z.string().optional(),
  attributionSkill: z.string().optional(),
  message: z.object({
    id: z.string().optional(),
    model: z.string(),
    usage: usageBlockSchema,
  }),
})

export type StrictAssistantRow = z.infer<typeof assistantRowSchema>

export type UsageOnlyAssistantRow = z.infer<typeof usageOnlyAssistantSchema>

export type AssistantData =
  | { kind: 'strict'; value: StrictAssistantRow }
  | { kind: 'usage-only'; value: UsageOnlyAssistantRow }

export type ClaudeCodeAssistantData = AssistantData

export type ClaudeCodeAssistantEntry = ClaudeCodeTranscriptEntry<
  'assistant',
  AssistantData
>

export const mapAssistantEntry: TranscriptMapper = (rawJson, rawLine, ctx) => {
  const strict = assistantRowSchema.safeParse(rawJson)
  if (strict.success) {
    const entry: ClaudeCodeAssistantEntry = {
      type: 'assistant',
      data: { kind: 'strict', value: strict.data },
      raw: rawLine,
      errors: [],
      modelUsages: [
        usageRow(strict.data.message.model, strict.data.message.usage),
      ],
    }
    return entry
  }

  const errors = [mapValidationError(strict.error, ctx.index)]
  const fallback = usageOnlyAssistantSchema.safeParse(rawJson)
  if (fallback.success) {
    const entry: ClaudeCodeAssistantEntry = {
      type: 'assistant',
      data: { kind: 'usage-only', value: fallback.data },
      raw: rawLine,
      errors,
      modelUsages: [
        usageRow(fallback.data.message.model, fallback.data.message.usage),
      ],
    }
    return entry
  }
  errors.push(mapValidationError(fallback.error, ctx.index))
  const entry: ClaudeCodeAssistantEntry = {
    type: 'assistant',
    data: null,
    raw: rawLine,
    errors,
    modelUsages: [],
  }
  return entry
}

export function extractToolUses(
  content: StrictAssistantRow['message']['content'],
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

function usageRow(
  model: string,
  usage: z.infer<typeof usageBlockSchema>,
): ModelTokenUsage {
  return {
    model,
    usage: {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheCreation5mInputTokens:
        usage.cache_creation.ephemeral_5m_input_tokens,
      cacheCreation1hInputTokens:
        usage.cache_creation.ephemeral_1h_input_tokens,
      cacheReadInputTokens: usage.cache_read_input_tokens,
    },
  }
}
