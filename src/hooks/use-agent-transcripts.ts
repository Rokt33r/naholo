import { useQuery } from '@tanstack/react-query'
import type { AgentTranscriptStatsV1 } from 'naholo-agent-transcript-stats/claude-code'
import { fetcher } from '@/lib/fetcher'

export type AgentTranscriptSummary = {
  id: string
  transcriptId: string
  title: string | null
  startedAt: string
  endedAt: string
  hasTranscript: boolean
  transcriptSizeBytes: number
  stats: AgentTranscriptStatsV1 | null
  statsFormat: 'claude-code-v1' | null
  statsErrored: boolean
}

export function useAgentTranscripts(
  projectSlug: string,
  operationNumber: number,
) {
  return useQuery({
    queryKey: ['agent-transcripts', projectSlug, operationNumber],
    queryFn: () =>
      fetcher<AgentTranscriptSummary[]>(
        `/api/projects/${projectSlug}/operations/${operationNumber}/agent-transcripts`,
      ),
    staleTime: 1000 * 60,
  })
}
