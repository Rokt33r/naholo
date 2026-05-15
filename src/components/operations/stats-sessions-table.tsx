import { cn } from '@/lib/utils'
import type { SessionRowStats } from './stats-view'

type StatsSessionsTableProps = {
  rows: SessionRowStats[]
  onSelectAgentSession: (agentSessionSessionId: string) => void
}

export function StatsSessionsTable({
  rows,
  onSelectAgentSession,
}: StatsSessionsTableProps) {
  if (rows.length === 0) {
    return (
      <div className='rounded-md border p-6 text-center text-sm text-muted-foreground'>
        No agent sessions yet.
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
            const canOpen = row.agentSession.hasTranscript
            return (
              <tr
                key={row.agentSession.sessionId}
                onClick={() => {
                  if (canOpen) {
                    onSelectAgentSession(row.agentSession.sessionId)
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
                  {row.agentSession.title ?? (
                    <span className='text-muted-foreground'>(untitled)</span>
                  )}
                </Td>
                <Td className='text-right tabular-nums'>
                  {row.isLoading ? '…' : row.messageCount.toLocaleString()}
                </Td>
                <Td className='text-right tabular-nums'>
                  {formatDurationHMS(row.durationMs)}
                </Td>
                <Td className='text-right tabular-nums'>
                  {row.isLoading ? '…' : formatUSD(row.totalCost)}
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
