import { cn } from '@/lib/utils'
import type { TranscriptRowStats } from './stats-view'

type StatsTranscriptsTableProps = {
  rows: TranscriptRowStats[]
  onSelectAgentTranscript: (transcriptId: string) => void
}

export function StatsTranscriptsTable({
  rows,
  onSelectAgentTranscript,
}: StatsTranscriptsTableProps) {
  if (rows.length === 0) {
    return (
      <div className='rounded-md border p-6 text-center text-sm text-muted-foreground'>
        No agent transcripts yet.
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-md border'>
      <table className='w-full text-sm'>
        <thead className='bg-muted/50 text-xs text-muted-foreground'>
          <tr>
            <Th className='text-left'>Title</Th>
            <Th className='text-right'>Msgs</Th>
            <Th className='text-right'>Duration</Th>
            <Th className='text-right'>Cost</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hasStats = row.stats != null
            const fullFailure = !hasStats && row.statsErrored
            const canOpen = hasStats && row.agentTranscript.hasTranscript
            return (
              <tr
                key={row.agentTranscript.transcriptId}
                onClick={() => {
                  if (canOpen) {
                    onSelectAgentTranscript(row.agentTranscript.transcriptId)
                  }
                }}
                className={cn(
                  'border-t',
                  canOpen
                    ? 'cursor-pointer hover:bg-muted/50'
                    : 'cursor-default text-muted-foreground',
                )}
              >
                <Td className='max-w-[280px] truncate'>
                  {row.agentTranscript.title ?? (
                    <span className='text-muted-foreground'>(untitled)</span>
                  )}
                </Td>
                <Td className='text-right tabular-nums'>
                  {hasStats ? row.messageCount.toLocaleString() : '—'}
                </Td>
                <Td className='text-right tabular-nums'>
                  {hasStats ? formatDurationHMS(row.durationMs) : '—'}
                </Td>
                <Td className='text-right tabular-nums'>
                  {fullFailure ? (
                    <span className='text-amber-600 dark:text-amber-400'>
                      failed to process transcript
                    </span>
                  ) : hasStats ? (
                    <span className='inline-flex items-center justify-end gap-2'>
                      <span>{formatUSD(row.totalCost)}</span>
                      {row.statsErrored ? (
                        <span
                          title='Some transcript entries failed to parse — totals may be incomplete.'
                          className='text-amber-600 dark:text-amber-400'
                        >
                          ⚠ partial parse
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    '—'
                  )}
                </Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <th className={cn('px-3 py-2 font-medium', className)}>{children}</th>
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <td className={cn('px-3 py-2', className)}>{children}</td>
}

function formatUSD(value: number | null): string {
  if (value == null) {
    return '—'
  }
  if (value < 0.01 && value > 0) {
    return '<$0.01'
  }
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDurationHMS(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}
