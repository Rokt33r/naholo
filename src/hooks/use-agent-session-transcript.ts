import { useQuery } from '@tanstack/react-query'
import { createResponseError } from '@/lib/fetcher'
import {
  parseTranscript,
  type TranscriptEntry,
} from '@/lib/agent-session-transcript'

async function fetchTranscriptText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw await createResponseError(response)
  }
  return await response.text()
}

export function useAgentSessionTranscript(
  projectSlug: string,
  operationNumber: number,
  agentSessionSessionId: string | null,
) {
  return useQuery({
    queryKey: [
      'agent-session-transcript',
      projectSlug,
      operationNumber,
      agentSessionSessionId,
    ],
    queryFn: () =>
      fetchTranscriptText(
        `/api/projects/${projectSlug}/operations/${operationNumber}/agent-sessions/${agentSessionSessionId}/transcript`,
      ),
    select: (jsonl): TranscriptEntry[] => parseTranscript(jsonl),
    enabled: agentSessionSessionId != null,
    staleTime: 1000 * 60,
  })
}
