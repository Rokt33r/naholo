'use client'

import { useQueries } from '@tanstack/react-query'
import { createResponseError } from '@/lib/fetcher'
import {
  parseTranscript,
  type TranscriptEntry,
} from '@/lib/agent-session-transcript'
import {
  useAgentSessions,
  type AgentSessionSummary,
} from '@/hooks/use-agent-sessions'
import { StatsTotals } from './stats-totals'
import { StatsSessionsTable } from './stats-sessions-table'

export type SessionRowStats = {
  agentSession: AgentSessionSummary
  durationMs: number
  messageCount: number
  userCount: number
  assistantCount: number
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  tokenTotal: number
  isLoading: boolean
}

type StatsViewProps = {
  projectSlug: string
  operationNumber: number
  selectedAgentSessionId: string | null
  onSelectAgentSession: (agentSessionId: string) => void
}

async function fetchTranscriptText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw await createResponseError(response)
  }
  return await response.text()
}

export function StatsView({
  projectSlug,
  operationNumber,
  selectedAgentSessionId,
  onSelectAgentSession,
}: StatsViewProps) {
  const { data: agentSessions = [], isLoading } = useAgentSessions(
    projectSlug,
    operationNumber,
  )

  const transcriptQueries = useQueries({
    queries: agentSessions.map((agentSession) => ({
      queryKey: [
        'agent-session-transcript',
        projectSlug,
        operationNumber,
        agentSession.id,
      ],
      queryFn: () =>
        fetchTranscriptText(
          `/api/projects/${projectSlug}/operations/${operationNumber}/agent-sessions/${agentSession.id}/transcript`,
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

  return (
    <div className='flex h-full flex-col gap-4 overflow-auto p-4'>
      <StatsTotals rows={rows} />
      <StatsSessionsTable
        rows={rows}
        selectedAgentSessionId={selectedAgentSessionId}
        onSelectAgentSession={onSelectAgentSession}
      />
    </div>
  )
}

function aggregateEntries(entries: TranscriptEntry[]) {
  let messageCount = 0
  let userCount = 0
  let assistantCount = 0
  let inputTokens = 0
  let outputTokens = 0
  let cacheCreationInputTokens = 0
  let cacheReadInputTokens = 0

  for (const entry of entries) {
    if (entry.type === 'user' || entry.type === 'assistant') {
      messageCount += 1
      if (entry.type === 'user') {
        userCount += 1
      } else {
        assistantCount += 1
      }
    }
    if (entry.usage != null) {
      inputTokens += entry.usage.inputTokens
      outputTokens += entry.usage.outputTokens
      cacheCreationInputTokens += entry.usage.cacheCreationInputTokens
      cacheReadInputTokens += entry.usage.cacheReadInputTokens
    }
  }

  return {
    messageCount,
    userCount,
    assistantCount,
    inputTokens,
    outputTokens,
    cacheCreationInputTokens,
    cacheReadInputTokens,
    tokenTotal:
      inputTokens +
      outputTokens +
      cacheCreationInputTokens +
      cacheReadInputTokens,
  }
}
