'use client'

import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { createResponseError } from '@/lib/fetcher'
import {
  parseTranscript,
  type TranscriptEntry,
} from '@/lib/agent-session-transcript'
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
  durationMs: number
  messageCount: number
  userCount: number
  assistantCount: number
  perModel: PerModelTotals[]
  totalCost: number | null
  toolUseCount: number
  toolUseByName: Record<string, number>
  bySkill: Record<string, number>
  isLoading: boolean
}

type StatsViewProps = {
  projectSlug: string
  operationNumber: number
}

async function fetchTranscriptText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw await createResponseError(response)
  }
  return await response.text()
}

export function StatsView({ projectSlug, operationNumber }: StatsViewProps) {
  const { data: agentSessions = [], isLoading } = useAgentSessions(
    projectSlug,
    operationNumber,
  )
  const [openAgentSessionSessionId, setOpenAgentSessionSessionId] = useState<
    string | null
  >(null)

  const transcriptQueries = useQueries({
    queries: agentSessions.map((agentSession) => ({
      queryKey: [
        'agent-session-transcript',
        projectSlug,
        operationNumber,
        agentSession.sessionId,
      ],
      queryFn: () =>
        fetchTranscriptText(
          `/api/projects/${projectSlug}/operations/${operationNumber}/agent-sessions/${agentSession.sessionId}/transcript`,
        ),
      select: (jsonl: string): TranscriptEntry[] => parseTranscript(jsonl),
      enabled: agentSession.hasTranscript,
      staleTime: 1000 * 60,
    })),
  })

  const rows: SessionRowStats[] = agentSessions.map((agentSession, i) => {
    const query = transcriptQueries[i]
    const durationMs =
      new Date(agentSession.endedAt).getTime() -
      new Date(agentSession.startedAt).getTime()
    const entries = query?.data ?? []
    const stats = aggregateEntries(entries)
    return {
      agentSession,
      durationMs,
      isLoading: agentSession.hasTranscript && query?.isLoading === true,
      ...stats,
    }
  })

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

function aggregateEntries(entries: TranscriptEntry[]) {
  let messageCount = 0
  let userCount = 0
  let assistantCount = 0
  let toolUseCount = 0
  const toolUseByName: Record<string, number> = {}
  const bySkill: Record<string, number> = {}

  const perModelMap = new Map<
    string,
    {
      inputTokens: number
      outputTokens: number
      cacheCreation5mInputTokens: number
      cacheCreation1hInputTokens: number
      cacheReadInputTokens: number
    }
  >()
  const seenMessageIds = new Set<string>()

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
    bySkill[skillKey] =
      (bySkill[skillKey] ?? 0) +
      calculateWeightedTokens(entry.usage, entry.model)
    const modelKey = entry.model ?? UNKNOWN_MODEL
    let bucket = perModelMap.get(modelKey)
    if (bucket == null) {
      bucket = {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreation5mInputTokens: 0,
        cacheCreation1hInputTokens: 0,
        cacheReadInputTokens: 0,
      }
      perModelMap.set(modelKey, bucket)
    }
    bucket.inputTokens += entry.usage.inputTokens
    bucket.outputTokens += entry.usage.outputTokens
    bucket.cacheCreation5mInputTokens += entry.usage.cacheCreation5mInputTokens
    bucket.cacheCreation1hInputTokens += entry.usage.cacheCreation1hInputTokens
    bucket.cacheReadInputTokens += entry.usage.cacheReadInputTokens
  }

  const perModel: PerModelTotals[] = []
  let totalCost: number | null = 0
  for (const [model, bucket] of perModelMap) {
    const usage = {
      inputTokens: bucket.inputTokens,
      outputTokens: bucket.outputTokens,
      cacheCreation5mInputTokens: bucket.cacheCreation5mInputTokens,
      cacheCreation1hInputTokens: bucket.cacheCreation1hInputTokens,
      cacheReadInputTokens: bucket.cacheReadInputTokens,
    }
    const weighted = calculateWeightedTokens(usage, model)
    const cost = model === UNKNOWN_MODEL ? null : calculateCost(usage, model)
    if (cost == null) {
      totalCost = null
    } else if (totalCost != null) {
      totalCost += cost
    }
    perModel.push({ model, ...bucket, weightedTokens: weighted, cost })
  }

  return {
    messageCount,
    userCount,
    assistantCount,
    perModel,
    totalCost,
    toolUseCount,
    toolUseByName,
    bySkill,
  }
}
