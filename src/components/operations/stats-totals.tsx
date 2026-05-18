import { calculateCost, getModelPricing } from '@/lib/agent-session-pricing'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  NO_SKILL,
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
  let toolUseCount = 0
  const toolUseByName: Record<string, number> = {}
  const bySkill: Record<string, number> = {}

  const perModelMap = new Map<string, PerModelTotals>()

  for (const row of rows) {
    messageCount += row.messageCount
    userCount += row.userCount
    assistantCount += row.assistantCount
    durationMs += row.durationMs
    toolUseCount += row.toolUseCount
    for (const [name, count] of Object.entries(row.toolUseByName)) {
      toolUseByName[name] = (toolUseByName[name] ?? 0) + count
    }
    for (const [skill, count] of Object.entries(row.bySkill)) {
      bySkill[skill] = (bySkill[skill] ?? 0) + count
    }
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

  const toolNamesSorted = Object.entries(toolUseByName).sort(
    (a, b) => b[1] - a[1],
  )
  const skillsSorted = Object.entries(bySkill).sort((a, b) => {
    if (a[0] === NO_SKILL) {
      return 1
    }
    if (b[0] === NO_SKILL) {
      return -1
    }
    return b[1] - a[1]
  })

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

  let totalCost: number | null = null
  for (const m of perModelRows) {
    if (m.cost == null) {
      continue
    }
    totalCost = (totalCost ?? 0) + m.cost
  }

  return (
    <div className='flex flex-col gap-4 rounded-md border p-4 text-sm'>
      <div className='grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-4'>
        <Stat label='Approx. cost' value={formatUSD(totalCost)} />
        <Stat label='Sessions' value={formatInt(sessionCount)} />
        <Stat
          label='Messages'
          value={`${formatInt(messageCount)} (${formatInt(userCount)} user / ${formatInt(assistantCount)} asst)`}
        />
        <Stat label='Session time' value={formatDurationLong(durationMs)} />
      </div>

      <div className='flex flex-col gap-2 border-t pt-3'>
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

      {toolUseCount > 0 || skillsSorted.length > 0 ? (
        <div className='flex flex-col gap-3 border-t pt-3 text-xs'>
          {skillsSorted.length > 0 ? (
            <div className='flex items-start gap-3'>
              <span className='w-12 shrink-0 text-muted-foreground'>
                Skills
              </span>
              <div className='flex flex-col gap-0.5'>
                <span className='text-muted-foreground'>
                  {skillsSorted
                    .map(
                      ([skill, weighted]) =>
                        `${skill} ${formatCompact(weighted)}`,
                    )
                    .join(' · ')}
                </span>
                <span className='text-[10px] text-muted-foreground/70'>
                  weighted tokens attributed to each skill
                </span>
              </div>
            </div>
          ) : null}
          {toolUseCount > 0 ? (
            <div className='flex items-start gap-3'>
              <span className='w-12 shrink-0 text-muted-foreground'>Tools</span>
              <div className='flex flex-col gap-1'>
                <span className='font-medium tabular-nums'>
                  {formatInt(toolUseCount)}
                </span>
                <div className='pr-4 font-mono text-muted-foreground'>
                  {toolNamesSorted
                    .map(([name, count]) => `${name} ${formatInt(count)}`)
                    .join(' · ')}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function PerModelRow({
  row,
}: {
  row: PerModelTotals & { cost: number | null }
}) {
  const isUnknown = row.model === UNKNOWN_MODEL
  const pricing = isUnknown ? null : getModelPricing(row.model)
  return (
    <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-xs'>
      <div className='flex flex-wrap items-baseline gap-x-2'>
        <span className='font-mono font-medium'>{row.model}</span>
        <span className='text-muted-foreground tabular-nums'>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='cursor-help underline decoration-dotted underline-offset-2'>
                {formatCompact(row.weightedTokens)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {pricing != null ? (
                <div className='flex flex-col gap-0.5 text-xs tabular-nums'>
                  <div className='font-medium'>Weight scaling</div>
                  <div>input × {pricing.inputTokenWeight}</div>
                  <div>output × {pricing.outputTokenWeight}</div>
                  <div>
                    cache create 5m × {pricing.cacheCreation5mTokenWeight}
                  </div>
                  <div>
                    cache create 1h × {pricing.cacheCreation1hTokenWeight}
                  </div>
                  <div>cache read × {pricing.cacheReadTokenWeight}</div>
                </div>
              ) : (
                <span className='text-xs'>Unknown model — no scaling</span>
              )}
            </TooltipContent>
          </Tooltip>
          (weighted, in {formatCompact(row.inputTokens)} · out{' '}
          {formatCompact(row.outputTokens)} · c5m{' '}
          {formatCompact(row.cacheCreation5mInputTokens)} · c1h{' '}
          {formatCompact(row.cacheCreation1hInputTokens)} · r{' '}
          {formatCompact(row.cacheReadInputTokens)})
        </span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className='cursor-help font-medium tabular-nums underline decoration-dotted underline-offset-2'>
            {formatUSD(row.cost)}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {pricing != null ? (
            <span className='text-xs tabular-nums'>
              Base token price: ${pricing.baseTokenPricePerMTok}/MTok
            </span>
          ) : (
            <span className='text-xs'>Unknown model — no price</span>
          )}
        </TooltipContent>
      </Tooltip>
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
