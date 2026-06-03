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

export function useAgentTranscriptBody(
  projectSlug: string,
  operationNumber: number,
  transcriptId: string | null,
) {
  return useQuery({
    queryKey: [
      'agent-transcript-body',
      projectSlug,
      operationNumber,
      transcriptId,
    ],
    queryFn: () =>
      fetchTranscriptText(
        `/api/projects/${projectSlug}/operations/${operationNumber}/agent-transcripts/${transcriptId}/transcript`,
      ),
    select: (jsonl): TranscriptEntry[] => parseTranscript(jsonl),
    enabled: transcriptId != null,
    staleTime: 1000 * 60,
  })
}
