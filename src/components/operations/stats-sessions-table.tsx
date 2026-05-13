import { cn } from '@/lib/utils'
import type { SessionRowStats } from './stats-view'

type StatsSessionsTableProps = {
  rows: SessionRowStats[]
  selectedAgentSessionId: string | null
  onSelectAgentSession: (agentSessionId: string) => void
}

export function StatsSessionsTable({
  rows,
  selectedAgentSessionId,
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
            <Th className='text-left'>Started</Th>
            <Th className='text-right'>Duration</Th>
            <Th className='text-right'>Msgs</Th>
            <Th className='text-right'>Tokens</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = selectedAgentSessionId === row.agentSession.id
            return (
              <tr
                key={row.agentSession.id}
                onClick={() => onSelectAgentSession(row.agentSession.id)}
                className={cn(
                  'cursor-pointer border-t hover:bg-muted/50',
                  isSelected && 'bg-muted',
                )}
              >
                <Td className='max-w-[280px] truncate'>
                  {row.agentSession.title ?? (
                    <span className='text-muted-foreground'>(untitled)</span>
                  )}
                </Td>
                <Td>{formatStartedAt(row.agentSession.startedAt)}</Td>
                <Td className='text-right tabular-nums'>
                  {formatDurationHMS(row.durationMs)}
                </Td>
                <Td className='text-right tabular-nums'>
                  {row.isLoading ? '…' : row.messageCount.toLocaleString()}
                </Td>
                <Td className='text-right tabular-nums'>
                  {row.isLoading ? '…' : row.tokenTotal.toLocaleString()}
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

function formatStartedAt(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${min}`
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
