import { z } from 'zod'
import type {
  ClaudeCodeTranscriptEntry,
  ModelTokenUsage,
  TranscriptMapper,
} from './types'
import { mapValidationError } from './utils'

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
            inference_geo: z.unknown().optional(),
            iterations: z.unknown().optional(),
            speed: z.unknown().optional(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict()

export type ClaudeCodeAssistantData = z.infer<typeof assistantRowSchema>

export type ClaudeCodeAssistantEntry = ClaudeCodeTranscriptEntry<
  'assistant',
  ClaudeCodeAssistantData
>

export const mapAssistantEntry: TranscriptMapper = (rawJson, rawLine, ctx) => {
  const parsed = assistantRowSchema.safeParse(rawJson)
  if (!parsed.success) {
    const entry: ClaudeCodeAssistantEntry = {
      type: 'assistant',
      data: null,
      raw: rawLine,
      errors: [mapValidationError(parsed.error, ctx.index)],
      modelUsages: [],
    }
    return entry
  }
  const entry: ClaudeCodeAssistantEntry = {
    type: 'assistant',
    data: parsed.data,
    raw: rawLine,
    errors: [],
    modelUsages: [usageFromAssistantData(parsed.data)],
  }
  return entry
}

export function extractToolUses(
  content: ClaudeCodeAssistantData['message']['content'],
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

function usageFromAssistantData(
  data: ClaudeCodeAssistantData,
): ModelTokenUsage {
  const u = data.message.usage
  return {
    model: data.message.model,
    usage: {
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheCreation5mInputTokens: u.cache_creation.ephemeral_5m_input_tokens,
      cacheCreation1hInputTokens: u.cache_creation.ephemeral_1h_input_tokens,
      cacheReadInputTokens: u.cache_read_input_tokens,
    },
  }
}
