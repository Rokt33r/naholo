import { z } from 'zod'
import type {
  ClaudeCodeTokenUsage,
  ClaudeCodeTranscriptEntry,
} from './claude-code-transcript.js'

// ---- Format identifier ----

export const CLAUDE_CODE_V1 = 'claude-code-v1' as const

export type StatsFormat = typeof CLAUDE_CODE_V1 | (string & {})

// ---- v1 constants ----

export const CLAUDE_CODE_V1_IDLE_THRESHOLD_MS = 5 * 60 * 1000

export const NO_SKILL = '(none)'
export const UNKNOWN_MODEL = 'unknown'

// ---- v1 stats shape ----
//
// Both `perModel` and `bySkill` store **raw** token buckets — no pre-weighting
// at upsert. Frontend applies the weight table from `agent-session-pricing.ts`
// to derive weighted-token totals and cost at render time.

export type PerModelTokens = {
  model: string
  usage: ClaudeCodeTokenUsage
}

export type AgentSessionStatsV1 = {
  messageCount: number
  userCount: number
  assistantCount: number
  toolUseCount: number
  toolUseByName: Record<string, number>
  // Raw token buckets per skill, broken down per model — same `{ model, usage }`
  // element shape as the top-level `perModel`. Weighting is render-time.
  bySkill: Record<string, PerModelTokens[]>
  perModel: PerModelTokens[]
  // Sum of gaps between consecutive transcript-entry timestamps, dropping any
  // gap longer than `CLAUDE_CODE_V1_IDLE_THRESHOLD_MS`.
  activeDurationMs: number
}

// ---- v1 aggregator ----

function emptyUsage(): ClaudeCodeTokenUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreation5mInputTokens: 0,
    cacheCreation1hInputTokens: 0,
    cacheReadInputTokens: 0,
  }
}

function addUsage(
  target: ClaudeCodeTokenUsage,
  add: ClaudeCodeTokenUsage,
): void {
  target.inputTokens += add.inputTokens
  target.outputTokens += add.outputTokens
  target.cacheCreation5mInputTokens += add.cacheCreation5mInputTokens
  target.cacheCreation1hInputTokens += add.cacheCreation1hInputTokens
  target.cacheReadInputTokens += add.cacheReadInputTokens
}

export function aggregateClaudeCodeV1(
  entries: ClaudeCodeTranscriptEntry[],
): AgentSessionStatsV1 {
  let messageCount = 0
  let userCount = 0
  let assistantCount = 0
  let toolUseCount = 0
  const toolUseByName: Record<string, number> = {}
  const bySkillModelMap = new Map<string, Map<string, ClaudeCodeTokenUsage>>()

  const perModelMap = new Map<string, ClaudeCodeTokenUsage>()
  const seenMessageIds = new Set<string>()

  let activeDurationMs = 0
  let previousTimestampMs: number | null = null

  for (const entry of entries) {
    if (entry.type === 'user' || entry.type === 'assistant') {
      messageCount += 1
      if (entry.type === 'user') {
        userCount += 1
      } else {
        assistantCount += 1
      }
    }
    for (const name of entry.toolUses) {
      toolUseCount += 1
      toolUseByName[name] = (toolUseByName[name] ?? 0) + 1
    }

    if (entry.timestamp != null) {
      const tsMs = Date.parse(entry.timestamp)
      if (Number.isFinite(tsMs)) {
        if (previousTimestampMs != null) {
          const gap = tsMs - previousTimestampMs
          if (gap > 0 && gap <= CLAUDE_CODE_V1_IDLE_THRESHOLD_MS) {
            activeDurationMs += gap
          }
        }
        previousTimestampMs = tsMs
      }
    }

    if (entry.usage == null) {
      continue
    }
    if (entry.messageId != null) {
      if (seenMessageIds.has(entry.messageId)) {
        continue
      }
      seenMessageIds.add(entry.messageId)
    }

    const skillKey = entry.attributionSkill ?? NO_SKILL
    const modelKey = entry.model ?? UNKNOWN_MODEL

    let skillModelMap = bySkillModelMap.get(skillKey)
    if (skillModelMap == null) {
      skillModelMap = new Map<string, ClaudeCodeTokenUsage>()
      bySkillModelMap.set(skillKey, skillModelMap)
    }
    let skillModelBucket = skillModelMap.get(modelKey)
    if (skillModelBucket == null) {
      skillModelBucket = emptyUsage()
      skillModelMap.set(modelKey, skillModelBucket)
    }
    addUsage(skillModelBucket, entry.usage)

    let modelBucket = perModelMap.get(modelKey)
    if (modelBucket == null) {
      modelBucket = emptyUsage()
      perModelMap.set(modelKey, modelBucket)
    }
    addUsage(modelBucket, entry.usage)
  }

  const perModel: PerModelTokens[] = []
  for (const [model, usage] of perModelMap) {
    perModel.push({ model, usage })
  }

  const bySkill: Record<string, PerModelTokens[]> = {}
  for (const [skill, modelMap] of bySkillModelMap) {
    const rows: PerModelTokens[] = []
    for (const [model, usage] of modelMap) {
      rows.push({ model, usage })
    }
    bySkill[skill] = rows
  }

  return {
    messageCount,
    userCount,
    assistantCount,
    toolUseCount,
    toolUseByName,
    bySkill,
    perModel,
    activeDurationMs,
  }
}

// ---- Zod schema for runtime validation ----

const claudeTokenUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreation5mInputTokens: z.number(),
  cacheCreation1hInputTokens: z.number(),
  cacheReadInputTokens: z.number(),
})

const perModelTokensSchema = z.object({
  model: z.string(),
  usage: claudeTokenUsageSchema,
})

export const agentSessionStatsV1Schema: z.ZodType<AgentSessionStatsV1> =
  z.object({
    messageCount: z.number(),
    userCount: z.number(),
    assistantCount: z.number(),
    toolUseCount: z.number(),
    toolUseByName: z.record(z.string(), z.number()),
    bySkill: z.record(z.string(), z.array(perModelTokensSchema)),
    perModel: z.array(perModelTokensSchema),
    activeDurationMs: z.number(),
  })
