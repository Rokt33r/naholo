import type { ModelTokenUsage } from 'naholo-agent-transcript-stats/claude-code'
import {
  calculateCost,
  calculateWeightedTokens,
  getModelPricing,
} from '@/lib/agent-session-pricing'
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

type Usage = {
  inputTokens: number
  outputTokens: number
  cacheCreation5mInputTokens: number
  cacheCreation1hInputTokens: number
  cacheReadInputTokens: number
}

type PerSkillModelRow = {
  model: string
  weightedTokens: number
}

type SkillRow = {
  skill: string
  modelUsages: PerSkillModelRow[]
  totalWeightedTokens: number
}

export function StatsTotals({ rows }: StatsTotalsProps) {
  const sessionCount = rows.length

  let messageCount = 0
  let userCount = 0
  let assistantCount = 0
  let durationMs = 0
  let toolUseCount = 0
  const toolUseByName: Record<string, number> = {}
  const skillModelUsagesMap = new Map<string, Map<string, Usage>>()

  const modelUsageMap = new Map<string, Usage>()

  for (const row of rows) {
    if (row.stats == null) {
      continue
    }
    messageCount += row.messageCount
    userCount += row.userCount
    assistantCount += row.assistantCount
    durationMs += row.durationMs
    toolUseCount += row.toolUseCount
    for (const [name, count] of Object.entries(row.toolUseByName)) {
      toolUseByName[name] = (toolUseByName[name] ?? 0) + count
    }
    for (const [skill, modelUsages] of Object.entries(
      row.skillModelUsagesMap,
    )) {
      let modelMap = skillModelUsagesMap.get(skill)
      if (modelMap == null) {
        modelMap = new Map<string, Usage>()
        skillModelUsagesMap.set(skill, modelMap)
      }
      for (const modelUsage of modelUsages) {
        addModelUsageInto(modelMap, modelUsage.model, modelUsage.usage)
      }
    }
    for (const modelUsage of row.modelUsages) {
      addModelUsageInto(modelUsageMap, modelUsage.model, modelUsage)
    }
  }

  const toolNamesSorted = Object.entries(toolUseByName).sort(
    (a, b) => b[1] - a[1],
  )

  const skillsSorted: SkillRow[] = []
  for (const [skill, modelMap] of skillModelUsagesMap) {
    const modelUsages: PerSkillModelRow[] = []
    let totalWeighted = 0
    for (const [model, usage] of modelMap) {
      const weighted = calculateWeightedTokens(usage, model)
      modelUsages.push({ model, weightedTokens: weighted })
      totalWeighted += weighted
    }
    modelUsages.sort((a, b) => b.weightedTokens - a.weightedTokens)
    skillsSorted.push({
      skill,
      modelUsages,
      totalWeightedTokens: totalWeighted,
    })
  }
  skillsSorted.sort((a, b) => {
    if (a.skill === NO_SKILL) {
      return 1
    }
    if (b.skill === NO_SKILL) {
      return -1
    }
    return b.totalWeightedTokens - a.totalWeightedTokens
  })

  const modelRows = Array.from(modelUsageMap, ([model, usage]) => ({
    model,
    ...usage,
    weightedTokens: calculateWeightedTokens(usage, model),
    cost: model === UNKNOWN_MODEL ? null : calculateCost(usage, model),
  }))
  modelRows.sort((a, b) => {
    if (a.model === UNKNOWN_MODEL) {
      return 1
    }
    if (b.model === UNKNOWN_MODEL) {
      return -1
    }
    return (b.cost ?? 0) - (a.cost ?? 0)
  })

  let totalCost: number | null = null
  for (const modelRow of modelRows) {
    if (modelRow.cost == null) {
      continue
    }
    totalCost = (totalCost ?? 0) + modelRow.cost
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
        {modelRows.length === 0 ? (
          <div className='text-xs text-muted-foreground'>
            No usage recorded.
          </div>
        ) : (
          <div className='flex flex-col gap-1'>
            {modelRows.map((modelRow) => (
              <PerModelRow key={modelRow.model} row={modelRow} />
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
              <div className='flex flex-col gap-1'>
                {skillsSorted.map((skillRow) => (
                  <div
                    key={skillRow.skill}
                    className='flex flex-wrap items-baseline gap-x-2'
                  >
                    <span className='font-medium'>{skillRow.skill}</span>
                    <span className='text-muted-foreground'>
                      {skillRow.modelUsages
                        .map(
                          (modelUsage) =>
                            `${modelUsage.model} ${formatCompact(modelUsage.weightedTokens)}`,
                        )
                        .join(' · ')}
                    </span>
                  </div>
                ))}
                <span className='text-[10px] text-muted-foreground/70'>
                  weighted tokens attributed to each (skill, model)
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

function addModelUsageInto(
  modelMap: Map<string, Usage>,
  model: string,
  usage: ModelTokenUsage['usage'],
): void {
  let bucket = modelMap.get(model)
  if (bucket == null) {
    bucket = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreation5mInputTokens: 0,
      cacheCreation1hInputTokens: 0,
      cacheReadInputTokens: 0,
    }
    modelMap.set(model, bucket)
  }
  bucket.inputTokens += usage.inputTokens
  bucket.outputTokens += usage.outputTokens
  bucket.cacheCreation5mInputTokens += usage.cacheCreation5mInputTokens
  bucket.cacheCreation1hInputTokens += usage.cacheCreation1hInputTokens
  bucket.cacheReadInputTokens += usage.cacheReadInputTokens
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
