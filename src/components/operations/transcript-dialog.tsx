'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createResponseError } from '@/lib/fetcher'
import type { AgentTranscriptSummary } from '@/hooks/use-agent-transcripts'
import { StatsTotals } from './stats-totals'
import type { TranscriptRowStats } from './stats-view'
import { TranscriptViewer } from './transcript-viewer'

type TranscriptDialogProps = {
  projectSlug: string
  operationNumber: number
  agentTranscript: AgentTranscriptSummary | null
  stats: TranscriptRowStats | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TranscriptDialog({
  projectSlug,
  operationNumber,
  agentTranscript,
  stats,
  open,
  onOpenChange,
}: TranscriptDialogProps) {
  const queryClient = useQueryClient()
  const [isDownloading, setIsDownloading] = useState(false)

  if (agentTranscript == null) {
    return null
  }

  const transcriptUrl = `/api/projects/${projectSlug}/operations/${operationNumber}/agent-transcripts/${agentTranscript.transcriptId}/transcript`
  const queryKey = [
    'agent-transcript-body',
    projectSlug,
    operationNumber,
    agentTranscript.transcriptId,
  ]

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      let jsonl = queryClient.getQueryData<string>(queryKey)
      if (jsonl == null) {
        const response = await fetch(transcriptUrl)
        if (!response.ok) {
          throw await createResponseError(response)
        }
        jsonl = await response.text()
        queryClient.setQueryData(queryKey, jsonl)
      }
      triggerJsonlDownload(jsonl, buildDownloadFilename(agentTranscript))
    } catch (error) {
      console.error('Failed to download transcript:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[80vh] max-w-3xl flex-col gap-0 p-0 sm:max-w-3xl'>
        <DialogHeader className='border-b px-4 py-3'>
          <DialogTitle className='truncate pr-8'>
            {agentTranscript.title ?? (
              <span className='text-muted-foreground'>(untitled)</span>
            )}
          </DialogTitle>
        </DialogHeader>
        {stats != null ? (
          <div className='border-b px-4 py-3'>
            <StatsTotals rows={[stats]} />
          </div>
        ) : null}
        <div className='min-h-0 flex-1 overflow-hidden'>
          <TranscriptViewer
            projectSlug={projectSlug}
            operationNumber={operationNumber}
            transcriptId={agentTranscript.transcriptId}
          />
        </div>
        <DialogFooter className='border-t px-4 py-3'>
          <Button
            variant='outline'
            onClick={handleDownload}
            disabled={isDownloading || !agentTranscript.hasTranscript}
          >
            {isDownloading ? (
              <Loader2 className='mr-1 size-4 animate-spin' />
            ) : (
              <Download className='mr-1 size-4' />
            )}
            Download .jsonl
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function buildDownloadFilename(
  agentTranscript: AgentTranscriptSummary,
): string {
  const slug = slugifyTitle(agentTranscript.title) || 'untitled'
  return `${slug}-${agentTranscript.transcriptId}.jsonl`
}

function slugifyTitle(title: string | null): string {
  if (title == null) {
    return ''
  }
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function triggerJsonlDownload(jsonl: string, filename: string): void {
  const blob = new Blob([jsonl], { type: 'application/x-ndjson' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
