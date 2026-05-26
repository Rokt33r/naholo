import type { AgentSessionStatsError, ClaudeCodeTokenUsage } from './types'
import { ClaudeCodeTranscriptParser } from './parser'
import {
  type ClaudeCodeAssistantEntry,
  mapAssistantEntry,
} from './assistant-entry'
import { mapUserEntry } from './user-entry'
import { mapSummaryEntry } from './summary-entry'

// ---- Format identifier ----

export const CLAUDE_CODE_V1 = 'claude-code-v1' as const

// ---- v1 constants ----

export const CLAUDE_CODE_V1_IDLE_THRESHOLD_MS = 5 * 60 * 1000

export const NO_SKILL = '(none)'
export const UNKNOWN_MODEL = 'unknown'

// ---- v1 stats shape ----
//
// Both `perModel` and `bySkill` store raw token buckets. Weighting is render-time.

export type PerModelTokens = {
  model: string
  usage: ClaudeCodeTokenUsage
}

export type AgentSessionStatsV1 = {
  userCount: number
  assistantCount: number
  summaryCount: number
  toolUseCount: number
  toolUseByName: Record<string, number>
  bySkill: Record<string, PerModelTokens[]>
  perModel: PerModelTokens[]
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
  const parser = new ClaudeCodeTranscriptParser({
    mappers: {
      user: mapUserEntry,
      assistant: mapAssistantEntry,
      summary: mapSummaryEntry,
    },
  })
  const result = parser.process(jsonl)

  const stats = newEmptyMutableStatsV1()
  for (const entry of result.entries) {
    if (entry == null) {
      continue
    }
    feedDuration(stats, entry.timestamp)
    switch (entry.type) {
      case 'user':
        stats.userCount += 1
        break
      case 'assistant':
        accumulateAssistant(stats, entry as ClaudeCodeAssistantEntry)
        break
      case 'summary':
        stats.summaryCount += 1
        break
    }
  }
  return {
    stats: finalizeV1(stats),
    errors: result.errors.map(envelopeFromError),
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

function envelopeFromError(error: Error): AgentSessionStatsError {
  const cause = error.cause
  if (cause != null && typeof cause === 'object' && 'kind' in cause) {
    return cause as AgentSessionStatsError
  }
  return {
    kind: 'parse_failure',
    message: error.message,
    entryIndex: null,
    path: null,
  }
}

function accumulateAssistant(
  stats: MutableAgentSessionStatsV1,
  entry: ClaudeCodeAssistantEntry,
): void {
  stats.assistantCount += 1
  for (const name of entry.toolUses) {
    stats.toolUseCount += 1
    stats.toolUseByName[name] = (stats.toolUseByName[name] ?? 0) + 1
  }
  if (stats.seenMessageIds.has(entry.messageId)) {
    return
  }
  stats.seenMessageIds.add(entry.messageId)

  const skillKey = entry.attributionSkill ?? NO_SKILL
  const modelKey = entry.model.length > 0 ? entry.model : UNKNOWN_MODEL

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
  addUsage(skillModelBucket, entry.usage)

  let modelBucket = stats.perModelMap.get(modelKey)
  if (modelBucket == null) {
    modelBucket = emptyUsage()
    stats.perModelMap.set(modelKey, modelBucket)
  }
  addUsage(modelBucket, entry.usage)
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
  const perModel: PerModelTokens[] = []
  for (const [model, usage] of stats.perModelMap) {
    perModel.push({ model, usage })
  }
  const bySkill: Record<string, PerModelTokens[]> = {}
  for (const [skill, modelMap] of stats.bySkillModelMap) {
    const rows: PerModelTokens[] = []
    for (const [model, usage] of modelMap) {
      rows.push({ model, usage })
    }
    bySkill[skill] = rows
  }
  return {
    userCount: stats.userCount,
    assistantCount: stats.assistantCount,
    summaryCount: stats.summaryCount,
    toolUseCount: stats.toolUseCount,
    toolUseByName: stats.toolUseByName,
    bySkill,
    perModel,
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
