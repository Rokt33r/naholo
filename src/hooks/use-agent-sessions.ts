import { useQuery } from '@tanstack/react-query'
import type { AgentSessionStatsV1 } from 'naholo-agent-session-stats/claude-code'
import { fetcher } from '@/lib/fetcher'

export type AgentSessionSummary = {
  id: string
  sessionId: string
  title: string | null
  startedAt: string
  endedAt: string
  hasTranscript: boolean
  transcriptSizeBytes: number
  stats: AgentSessionStatsV1 | null
  statsFormat: 'claude-code-v1' | null
  statsErrored: boolean
}

export function useAgentSessions(projectSlug: string, operationNumber: number) {
  return useQuery({
    queryKey: ['agent-sessions', projectSlug, operationNumber],
    queryFn: () =>
      fetcher<AgentSessionSummary[]>(
        `/api/projects/${projectSlug}/operations/${operationNumber}/agent-sessions`,
      ),
    staleTime: 1000 * 60,
  })
}
