'use client'

import { useState } from 'react'
import {
  CLAUDE_CODE_V1,
  type AgentTranscriptStatsV1,
  type ModelTokenUsage,
} from 'naholo-agent-transcripts/claude-code'
import {
  calculateCost,
  calculateWeightedTokens,
} from '@/lib/agent-session-pricing'
import {
  useAgentTranscripts,
  type AgentTranscriptSummary,
} from '@/hooks/use-agent-transcripts'
import { StatsTotals } from './stats-totals'
import { StatsTranscriptsTable } from './stats-transcripts-table'
import { TranscriptDialog } from './transcript-dialog'

export const UNKNOWN_MODEL = 'unknown'
export const NO_SKILL = '(none)'

export type PerModelTotals = {
  model: string
  inputTokens: number
  outputTokens: number
  cacheCreation5mInputTokens: number
  cacheCreation1hInputTokens: number
  cacheReadInputTokens: number
  weightedTokens: number
  cost: number | null
}

export type TranscriptRowStats = {
  agentTranscript: AgentTranscriptSummary
  stats: AgentTranscriptStatsV1 | null
  statsErrored: boolean
  durationMs: number
  messageCount: number
  userCount: number
  assistantCount: number
  modelUsages: PerModelTotals[]
  totalCost: number | null
  toolUseCount: number
  toolUseByName: Record<string, number>
  skillModelUsagesMap: Record<string, ModelTokenUsage[]>
}

type StatsViewProps = {
  projectSlug: string
  operationNumber: number
}

export function StatsView({ projectSlug, operationNumber }: StatsViewProps) {
  const { data: agentTranscripts = [], isLoading } = useAgentTranscripts(
    projectSlug,
    operationNumber,
  )
  const [openAgentTranscriptId, setOpenAgentTranscriptId] = useState<
    string | null
  >(null)

  const rows: TranscriptRowStats[] = agentTranscripts.map(buildTranscriptRow)

  if (isLoading) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground'>
        Loading stats…
      </div>
    )
  }

  const openAgentTranscript =
    openAgentTranscriptId == null
      ? null
      : (agentTranscripts.find(
          (t) => t.transcriptId === openAgentTranscriptId,
        ) ?? null)
  const openStats =
    openAgentTranscriptId == null
      ? null
      : (rows.find(
          (r) => r.agentTranscript.transcriptId === openAgentTranscriptId,
        ) ?? null)

  return (
    <div className='flex h-full flex-col gap-4 overflow-auto p-4'>
      <StatsTotals rows={rows} />
      <StatsTranscriptsTable
        rows={rows}
        onSelectAgentTranscript={setOpenAgentTranscriptId}
      />
      <TranscriptDialog
        projectSlug={projectSlug}
        operationNumber={operationNumber}
        agentTranscript={openAgentTranscript}
        stats={openStats}
        open={openAgentTranscript != null}
        onOpenChange={(open) => {
          if (!open) {
            setOpenAgentTranscriptId(null)
          }
        }}
      />
    </div>
  )
}

function buildTranscriptRow(
  agentTranscript: AgentTranscriptSummary,
): TranscriptRowStats {
  const stats =
    agentTranscript.statsFormat === CLAUDE_CODE_V1
      ? agentTranscript.stats
      : null
  if (stats == null) {
    return {
      agentTranscript,
      stats: null,
      statsErrored: agentTranscript.statsErrored,
      durationMs: 0,
      messageCount: 0,
      userCount: 0,
      assistantCount: 0,
      modelUsages: [],
      totalCost: null,
      toolUseCount: 0,
      toolUseByName: {},
      skillModelUsagesMap: {},
    }
  }
  const modelUsages = stats.modelUsages.map(perModelTokensToTotals)
  return {
    agentTranscript,
    stats,
    statsErrored: agentTranscript.statsErrored,
    durationMs: stats.activeDurationMs,
    messageCount: stats.userCount + stats.assistantCount,
    userCount: stats.userCount,
    assistantCount: stats.assistantCount,
    modelUsages,
    totalCost: sumModelUsagesCost(modelUsages),
    toolUseCount: stats.toolUseCount,
    toolUseByName: stats.toolUseByName,
    skillModelUsagesMap: stats.skillModelUsagesMap,
  }
}

function perModelTokensToTotals(p: ModelTokenUsage): PerModelTotals {
  const usage = p.usage
  const weightedTokens = calculateWeightedTokens(usage, p.model)
  const cost = p.model === UNKNOWN_MODEL ? null : calculateCost(usage, p.model)
  return {
    model: p.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheCreation5mInputTokens: usage.cacheCreation5mInputTokens,
    cacheCreation1hInputTokens: usage.cacheCreation1hInputTokens,
    cacheReadInputTokens: usage.cacheReadInputTokens,
    weightedTokens,
    cost,
  }
}

function sumModelUsagesCost(modelUsages: PerModelTotals[]): number | null {
  if (modelUsages.length === 0) {
    return 0
  }
  let total: number | null = 0
  for (const modelUsage of modelUsages) {
    if (modelUsage.cost == null) {
      return null
    }
    total += modelUsage.cost
  }
  return total
}
