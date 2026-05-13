'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { TranscriptEntry } from '@/lib/agent-session-transcript'

type TranscriptEntryRowProps = {
  entry: TranscriptEntry
}

export function TranscriptEntryRow({ entry }: TranscriptEntryRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleToggle = () => {
    setIsExpanded((v) => !v)
  }

  const handleCopy = async (event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(JSON.stringify(entry.raw, null, 2))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch (error) {
      console.error('Failed to copy entry JSON:', error)
    }
  }

  return (
    <div className='border-b last:border-b-0'>
      <div
        className='flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50'
        onClick={handleToggle}
      >
        {isExpanded ? (
          <ChevronDown className='size-5 shrink-0 text-muted-foreground' />
        ) : (
          <ChevronRight className='size-5 shrink-0 text-muted-foreground' />
        )}
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 font-mono text-xs',
            typeBadgeClass(entry.type),
          )}
        >
          {entry.type}
        </span>
        <span className='shrink-0 font-mono text-xs text-muted-foreground tabular-nums'>
          {formatTimestamp(entry.timestamp)}
        </span>
        <span className='flex-1 truncate text-muted-foreground'>
          {entry.summary ?? ''}
        </span>
      </div>
      {isExpanded && (
        <div className='relative bg-muted/30 px-3 py-2'>
          <Button
            size='icon'
            variant='ghost'
            className='absolute right-2 top-2 size-7'
            onClick={handleCopy}
            title='Copy raw JSON'
          >
            {copied ? (
              <Check className='size-5' />
            ) : (
              <Copy className='size-5' />
            )}
          </Button>
          <pre className='max-h-[480px] overflow-auto whitespace-pre-wrap break-all pr-10 font-mono text-xs'>
            {JSON.stringify(entry.raw, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function formatTimestamp(iso: string | null): string {
  if (iso == null) {
    return '—'
  }
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${min}:${ss}`
}

function typeBadgeClass(type: string): string {
  switch (type) {
    case 'user':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    case 'assistant':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    case 'tool_use':
    case 'tool_result':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    case 'system':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    default:
      return 'bg-muted text-muted-foreground'
  }
}
