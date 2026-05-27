'use client'

import { useState } from 'react'
import {
  CLAUDE_CODE_V1,
  type AgentSessionStatsV1,
  type PerModelTokens,
} from 'naholo-agent-session-stats/claude-code'
import {
  calculateCost,
  calculateWeightedTokens,
} from '@/lib/agent-session-pricing'
import {
  useAgentSessions,
  type AgentSessionSummary,
} from '@/hooks/use-agent-sessions'
import { StatsTotals } from './stats-totals'
import { StatsSessionsTable } from './stats-sessions-table'
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

export type SessionRowStats = {
  agentSession: AgentSessionSummary
  stats: AgentSessionStatsV1 | null
  statsErrored: boolean
  durationMs: number
  messageCount: number
  userCount: number
  assistantCount: number
  modelUsages: PerModelTotals[]
  totalCost: number | null
  toolUseCount: number
  toolUseByName: Record<string, number>
  skillModelUsagesMap: Record<string, PerModelTokens[]>
}

type StatsViewProps = {
  projectSlug: string
  operationNumber: number
}

export function StatsView({ projectSlug, operationNumber }: StatsViewProps) {
  const { data: agentSessions = [], isLoading } = useAgentSessions(
    projectSlug,
    operationNumber,
  )
  const [openAgentSessionSessionId, setOpenAgentSessionSessionId] = useState<
    string | null
  >(null)

  const rows: SessionRowStats[] = agentSessions.map(buildSessionRow)

  if (isLoading) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground'>
        Loading stats…
      </div>
    )
  }

  const openAgentSession =
    openAgentSessionSessionId == null
      ? null
      : (agentSessions.find((s) => s.sessionId === openAgentSessionSessionId) ??
        null)
  const openStats =
    openAgentSessionSessionId == null
      ? null
      : (rows.find(
          (r) => r.agentSession.sessionId === openAgentSessionSessionId,
        ) ?? null)

  return (
    <div className='flex h-full flex-col gap-4 overflow-auto p-4'>
      <StatsTotals rows={rows} />
      <StatsSessionsTable
        rows={rows}
        onSelectAgentSession={setOpenAgentSessionSessionId}
      />
      <TranscriptDialog
        projectSlug={projectSlug}
        operationNumber={operationNumber}
        agentSession={openAgentSession}
        stats={openStats}
        open={openAgentSession != null}
        onOpenChange={(open) => {
          if (!open) {
            setOpenAgentSessionSessionId(null)
          }
        }}
      />
    </div>
  )
}

function buildSessionRow(agentSession: AgentSessionSummary): SessionRowStats {
  const stats =
    agentSession.statsFormat === CLAUDE_CODE_V1 ? agentSession.stats : null
  if (stats == null) {
    return {
      agentSession,
      stats: null,
      statsErrored: agentSession.statsErrored,
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
    agentSession,
    stats,
    statsErrored: agentSession.statsErrored,
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

function perModelTokensToTotals(p: PerModelTokens): PerModelTotals {
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
