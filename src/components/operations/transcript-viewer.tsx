'use client'

import { Loader2 } from 'lucide-react'
import { useAgentSessionTranscript } from '@/hooks/use-agent-session-transcript'
import { TranscriptEntryRow } from './transcript-entry-row'

type TranscriptViewerProps = {
  projectSlug: string
  operationNumber: number
  agentSessionId: string
}

export function TranscriptViewer({
  projectSlug,
  operationNumber,
  agentSessionId,
}: TranscriptViewerProps) {
  const {
    data: entries,
    isLoading,
    error,
  } = useAgentSessionTranscript(projectSlug, operationNumber, agentSessionId)

  if (isLoading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2 className='size-5 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (error != null) {
    return (
      <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
        Failed to load transcript: {error.message}
      </div>
    )
  }

  if (entries == null || entries.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
        Transcript is empty.
      </div>
    )
  }

  return (
    <div className='h-full overflow-auto'>
      {entries.map((entry) => (
        <TranscriptEntryRow key={entry.index} entry={entry} />
      ))}
    </div>
  )
}
