import type {
  AgentSessionStatsError,
  ClaudeCodeTokenUsage,
  ClaudeCodeTranscriptEntry,
  ModelTokenUsage,
} from './types'
import type { AssistantData } from './assistant-entry'
import { extractToolUses } from './assistant-entry'
import { getDefaultParser } from './default-parser'

// ---- Format identifier ----

export const CLAUDE_CODE_V1 = 'claude-code-v1' as const

// ---- v1 constants ----

export const CLAUDE_CODE_V1_IDLE_THRESHOLD_MS = 5 * 60 * 1000

export const NO_SKILL = '(none)'
export const UNKNOWN_MODEL = 'unknown'

// ---- v1 stats shape ----
//
// Both `modelUsages` and `skillModelUsagesMap` store raw token buckets. Weighting is render-time.

export type AgentSessionStatsV1 = {
  userCount: number
  assistantCount: number
  summaryCount: number
  toolUseCount: number
  toolUseByName: Record<string, number>
  skillModelUsagesMap: Record<string, ModelTokenUsage[]>
  modelUsages: ModelTokenUsage[]
  activeDurationMs: number
}

// ---- Aggregator ----

export type AggregateClaudeCodeV1Result = {
  stats: AgentSessionStatsV1
  errors: AgentSessionStatsError[]
}

export function aggregateClaudeCodeV1(
  jsonl: string,
): AggregateClaudeCodeV1Result {
  const parser = getDefaultParser()
  const result = parser.process(jsonl)

  const stats = newEmptyMutableStatsV1()
  const errors: AgentSessionStatsError[] = []
  for (const entry of result.entries) {
    for (const envelope of entry.errors) {
      errors.push(envelope)
    }
    feedDuration(stats, getEntryTimestamp(entry))
    if (entry.data == null) {
      continue
    }
    switch (entry.type) {
      case 'user':
        stats.userCount += 1
        break
      case 'assistant':
        accumulateAssistant(
          stats,
          entry.data as AssistantData,
          entry.modelUsages,
        )
        break
      case 'summary':
        stats.summaryCount += 1
        break
    }
  }
  return {
    stats: finalizeV1(stats),
    errors,
  }
}

// ---- Mutable accumulator ----

type MutableAgentSessionStatsV1 = {
  userCount: number
  assistantCount: number
  summaryCount: number
  toolUseCount: number
  toolUseByName: Record<string, number>
  bySkillModelMap: Map<string, Map<string, ClaudeCodeTokenUsage>>
  perModelMap: Map<string, ClaudeCodeTokenUsage>
  seenMessageIds: Set<string>
  activeDurationMs: number
  previousTimestampMs: number | null
}

function accumulateAssistant(
  stats: MutableAgentSessionStatsV1,
  data: AssistantData,
  modelUsages: ModelTokenUsage[],
): void {
  stats.assistantCount += 1

  let messageId: string | undefined
  let attributionSkill: string | undefined
  if (data.kind === 'strict') {
    const toolUses = extractToolUses(data.value.message.content)
    for (const name of toolUses) {
      stats.toolUseCount += 1
      stats.toolUseByName[name] = (stats.toolUseByName[name] ?? 0) + 1
    }
    messageId = data.value.message.id
    attributionSkill = data.value.attributionSkill
  } else {
    messageId = data.value.message.id
    attributionSkill = data.value.attributionSkill
  }

  if (messageId != null) {
    if (stats.seenMessageIds.has(messageId)) {
      return
    }
    stats.seenMessageIds.add(messageId)
  }

  const skillKey =
    attributionSkill != null && attributionSkill.length > 0
      ? attributionSkill
      : NO_SKILL

  for (const { model, usage } of modelUsages) {
    const modelKey = model.length > 0 ? model : UNKNOWN_MODEL

    let skillModelMap = stats.bySkillModelMap.get(skillKey)
    if (skillModelMap == null) {
      skillModelMap = new Map<string, ClaudeCodeTokenUsage>()
      stats.bySkillModelMap.set(skillKey, skillModelMap)
    }
    let skillModelBucket = skillModelMap.get(modelKey)
    if (skillModelBucket == null) {
      skillModelBucket = emptyUsage()
      skillModelMap.set(modelKey, skillModelBucket)
    }
    addUsage(skillModelBucket, usage)

    let modelBucket = stats.perModelMap.get(modelKey)
    if (modelBucket == null) {
      modelBucket = emptyUsage()
      stats.perModelMap.set(modelKey, modelBucket)
    }
    addUsage(modelBucket, usage)
  }
}

function feedDuration(
  stats: MutableAgentSessionStatsV1,
  timestamp: string | null,
): void {
  if (timestamp == null) {
    return
  }
  const tsMs = Date.parse(timestamp)
  if (!Number.isFinite(tsMs)) {
    return
  }
  if (stats.previousTimestampMs != null) {
    const gap = tsMs - stats.previousTimestampMs
    if (gap > 0 && gap <= CLAUDE_CODE_V1_IDLE_THRESHOLD_MS) {
      stats.activeDurationMs += gap
    }
  }
  stats.previousTimestampMs = tsMs
}

function getEntryTimestamp(entry: ClaudeCodeTranscriptEntry): string | null {
  if (entry.data == null) {
    return null
  }
  if (entry.type === 'assistant') {
    const data = entry.data as AssistantData
    const timestamp = data.value.timestamp
    return typeof timestamp === 'string' ? timestamp : null
  }
  const data = entry.data as { timestamp?: unknown }
  return typeof data.timestamp === 'string' ? data.timestamp : null
}

function newEmptyMutableStatsV1(): MutableAgentSessionStatsV1 {
  return {
    userCount: 0,
    assistantCount: 0,
    summaryCount: 0,
    toolUseCount: 0,
    toolUseByName: {},
    bySkillModelMap: new Map(),
    perModelMap: new Map(),
    seenMessageIds: new Set(),
    activeDurationMs: 0,
    previousTimestampMs: null,
  }
}

function finalizeV1(stats: MutableAgentSessionStatsV1): AgentSessionStatsV1 {
  const modelUsages: ModelTokenUsage[] = []
  for (const [model, usage] of stats.perModelMap) {
    modelUsages.push({ model, usage })
  }
  const skillModelUsagesMap: Record<string, ModelTokenUsage[]> = {}
  for (const [skill, modelMap] of stats.bySkillModelMap) {
    const rows: ModelTokenUsage[] = []
    for (const [model, usage] of modelMap) {
      rows.push({ model, usage })
    }
    skillModelUsagesMap[skill] = rows
  }
  return {
    userCount: stats.userCount,
    assistantCount: stats.assistantCount,
    summaryCount: stats.summaryCount,
    toolUseCount: stats.toolUseCount,
    toolUseByName: stats.toolUseByName,
    skillModelUsagesMap,
    modelUsages,
    activeDurationMs: stats.activeDurationMs,
  }
}

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
