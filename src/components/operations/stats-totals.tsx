import { calculateCost, PRICING } from '@/lib/agent-session-pricing'
import {
  UNKNOWN_MODEL,
  type PerModelTotals,
  type SessionRowStats,
} from './stats-view'

type StatsTotalsProps = {
  rows: SessionRowStats[]
}

export function StatsTotals({ rows }: StatsTotalsProps) {
  const sessionCount = rows.length

  let messageCount = 0
  let userCount = 0
  let assistantCount = 0
  let durationMs = 0

  const perModelMap = new Map<string, PerModelTotals>()

  for (const row of rows) {
    messageCount += row.messageCount
    userCount += row.userCount
    assistantCount += row.assistantCount
    durationMs += row.durationMs
    for (const m of row.perModel) {
      const existing = perModelMap.get(m.model)
      if (existing == null) {
        perModelMap.set(m.model, { ...m })
      } else {
        existing.inputTokens += m.inputTokens
        existing.outputTokens += m.outputTokens
        existing.cacheCreation5mInputTokens += m.cacheCreation5mInputTokens
        existing.cacheCreation1hInputTokens += m.cacheCreation1hInputTokens
        existing.cacheReadInputTokens += m.cacheReadInputTokens
      }
    }
  }

  const perModelRows = Array.from(perModelMap.values()).map((m) => ({
    ...m,
    cost:
      m.model === UNKNOWN_MODEL
        ? null
        : calculateCost(
            {
              inputTokens: m.inputTokens,
              outputTokens: m.outputTokens,
              cacheCreation5mInputTokens: m.cacheCreation5mInputTokens,
              cacheCreation1hInputTokens: m.cacheCreation1hInputTokens,
              cacheReadInputTokens: m.cacheReadInputTokens,
            },
            m.model,
          ),
  }))
  perModelRows.sort((a, b) => {
    if (a.model === UNKNOWN_MODEL) {
      return 1
    }
    if (b.model === UNKNOWN_MODEL) {
      return -1
    }
    return (b.cost ?? 0) - (a.cost ?? 0)
  })

  let totalCost: number | null = 0
  for (const m of perModelRows) {
    if (m.cost == null) {
      totalCost = null
      break
    }
    totalCost += m.cost
  }

  return (
    <div className='flex flex-col gap-4 rounded-md border p-4 text-sm'>
      <div className='grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3'>
        <Stat label='Sessions' value={formatInt(sessionCount)} />
        <Stat
          label='Messages'
          value={`${formatInt(messageCount)} (${formatInt(userCount)} user / ${formatInt(assistantCount)} asst)`}
        />
        <Stat label='Session time' value={formatDurationLong(durationMs)} />
      </div>

      <div className='flex flex-col gap-2 border-t pt-3'>
        <div className='flex items-baseline justify-between'>
          <span className='text-xs text-muted-foreground'>Approx. cost</span>
          <span className='text-base font-semibold tabular-nums'>
            {formatUSD(totalCost)}
          </span>
        </div>

        {perModelRows.length === 0 ? (
          <div className='text-xs text-muted-foreground'>
            No usage recorded.
          </div>
        ) : (
          <div className='flex flex-col gap-1'>
            {perModelRows.map((m) => (
              <PerModelRow key={m.model} row={m} />
            ))}
          </div>
        )}
      </div>

      <div className='border-t pt-2 text-xs text-muted-foreground'>
        Pricing as of {PRICING.recordedDate}
      </div>
    </div>
  )
}

function PerModelRow({
  row,
}: {
  row: PerModelTotals & { cost: number | null }
}) {
  return (
    <div className='flex flex-wrap items-baseline justify-between gap-x-4 text-xs'>
      <div className='flex flex-wrap items-baseline gap-x-3'>
        <span className='font-mono font-medium'>{row.model}</span>
        <span className='text-muted-foreground tabular-nums'>
          in {formatCompact(row.inputTokens)} · out{' '}
          {formatCompact(row.outputTokens)} · c5m{' '}
          {formatCompact(row.cacheCreation5mInputTokens)} · c1h{' '}
          {formatCompact(row.cacheCreation1hInputTokens)} · r{' '}
          {formatCompact(row.cacheReadInputTokens)}
        </span>
      </div>
      <span className='font-medium tabular-nums'>{formatUSD(row.cost)}</span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex flex-col'>
      <span className='text-xs text-muted-foreground'>{label}</span>
      <span className='font-medium'>{value}</span>
    </div>
  )
}

function formatInt(value: number): string {
  return value.toLocaleString()
}

function formatCompact(value: number): string {
  if (value < 1000) {
    return value.toString()
  }
  if (value < 1_000_000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  }
  return (value / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
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

function formatDurationLong(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours === 0) {
    return `${minutes}m`
  }
  return `${hours}h ${minutes}m`
}
