'use client'

import { useState } from 'react'
import {
  ArrowDownFromLine,
  CircleDot,
  CornerDownLeft,
  FileText,
  MoreVertical,
  Plus,
  SatelliteDish,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BrowserFrame } from './browser-frame'

const NOTE_NAME = 'transcript-schema'

export function CollectIntelMockup() {
  const [tab, setTab] = useState<'comms' | 'note'>('comms')

  return (
    <BrowserFrame title='naholo'>
      {/* Operation header */}
      <div className='flex items-center gap-2'>
        <CircleDot className='size-4 shrink-0 text-green-600' />
        <h3 className='truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
          <span className='font-mono text-zinc-400 dark:text-zinc-500'>
            #222
          </span>{' '}
          Redact ai transcripts
        </h3>
        <div className='ml-auto flex items-center gap-1'>
          <Button size='icon' variant='ghost' tabIndex={-1}>
            <ArrowDownFromLine className='size-4' />
          </Button>
          <Button size='icon' variant='ghost' tabIndex={-1}>
            <MoreVertical className='size-4' />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className='mt-3 flex flex-wrap items-center gap-1 border-b border-zinc-200 pb-2 dark:border-zinc-800'>
        <Button
          size='sm'
          variant={tab === 'comms' ? 'secondary' : 'ghost'}
          onClick={() => setTab('comms')}
        >
          <SatelliteDish className='mr-1 size-4' />
          Comms
        </Button>
        <Button
          size='sm'
          variant={tab === 'note' ? 'secondary' : 'ghost'}
          onClick={() => setTab('note')}
        >
          <FileText className='mr-1 size-4' />
          {NOTE_NAME}
        </Button>
        <Button size='sm' variant='ghost' tabIndex={-1}>
          <Plus className='mr-1 size-4' />
          Add Note
        </Button>
      </div>

      {/* Content */}
      {tab === 'comms' ? <CommsPane /> : <NotePane />}
    </BrowserFrame>
  )
}

function CommsPane() {
  return (
    <>
      <div className='mt-4 space-y-4'>
        <LogBubble author='Junyoung'>
          Users might be afraid to use the app because it uploads full
          transcripts. Need to remove all messages from both users and agents
        </LogBubble>
        <LogBubble own>
          Some tool usages are exposing file path. Should be better to redact
          all string other than we need for calculating stats.
        </LogBubble>
      </div>

      <div className='mt-4 flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800'>
        <span className='text-sm text-zinc-400 dark:text-zinc-600'>
          Type a message…
        </span>
        <Button size='icon' tabIndex={-1}>
          <CornerDownLeft className='size-4' />
        </Button>
      </div>
    </>
  )
}

function NotePane() {
  return (
    <div className='mt-4 space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200'>
      <h4 className='text-base font-semibold text-zinc-900 dark:text-zinc-50'>
        Agent transcript JSONL schema
      </h4>
      <p>One JSON object per line in transcript.jsonl.</p>
      <pre className='overflow-x-auto rounded-md border border-zinc-200 bg-zinc-100/70 p-3 font-mono text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300'>
        {`{"type":"assistant","sessionId":"01J…","model":"claude-…",
 "usage":{"input_tokens":…},"message":{"content":[{"text":"…"}]}}`}
      </pre>
      <p>
        <span className='font-medium text-zinc-900 dark:text-zinc-50'>
          Keep for stats:
        </span>{' '}
        sessionId, timestamp, model, usage.
      </p>
      <p>
        <span className='font-medium text-zinc-900 dark:text-zinc-50'>
          Redact everything else:
        </span>{' '}
        message.content (user and agent text), toolUseResult (file paths,
        stdout, env dumps).
      </p>
    </div>
  )
}

function LogBubble({
  author,
  own = false,
  children,
}: {
  author?: string
  own?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col', own && 'items-end')}>
      {!own && author != null && (
        <div className='mb-1 text-xs text-zinc-500 dark:text-zinc-400'>
          {author}
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-lg border p-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200',
          own
            ? 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
            : 'border-zinc-200 bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-800/50',
        )}
      >
        {children}
      </div>
    </div>
  )
}
