import type { SessionRowStats } from './stats-view'

type StatsTotalsProps = {
  rows: SessionRowStats[]
}

export function StatsTotals({ rows }: StatsTotalsProps) {
  const sessionCount = rows.length

  let messageCount = 0
  let userCount = 0
  let assistantCount = 0
  let inputTokens = 0
  let outputTokens = 0
  let cacheCreationInputTokens = 0
  let cacheReadInputTokens = 0
  let durationMs = 0

  for (const row of rows) {
    messageCount += row.messageCount
    userCount += row.userCount
    assistantCount += row.assistantCount
    durationMs += row.durationMs
    for (const m of row.perModel) {
      inputTokens += m.inputTokens
      outputTokens += m.outputTokens
      cacheCreationInputTokens +=
        m.cacheCreation5mInputTokens + m.cacheCreation1hInputTokens
      cacheReadInputTokens += m.cacheReadInputTokens
    }
  }

  return (
    <div className='rounded-md border p-4'>
      <div className='grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4'>
        <Stat label='Sessions' value={formatInt(sessionCount)} />
        <Stat
          label='Messages'
          value={`${formatInt(messageCount)} (${formatInt(userCount)} user / ${formatInt(assistantCount)} asst)`}
        />
        <Stat label='Session time' value={formatDurationLong(durationMs)} />
        <Stat label='Tokens in' value={formatCompact(inputTokens)} />
        <Stat label='Tokens out' value={formatCompact(outputTokens)} />
        <Stat
          label='Cache create'
          value={formatCompact(cacheCreationInputTokens)}
        />
        <Stat label='Cache read' value={formatCompact(cacheReadInputTokens)} />
      </div>
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

function formatDurationLong(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours === 0) {
    return `${minutes}m`
  }
  return `${hours}h ${minutes}m`
}
