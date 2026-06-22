'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { BrowserFrame } from './browser-frame'

type ModelRow = {
  model: string
  weighted: string
  breakdown: string
  cost: string
  basePrice: string
}

const MODEL_ROWS: ModelRow[] = [
  {
    model: 'claude-opus-4-7',
    weighted: '10.53M',
    breakdown: 'in 614 · out 216.4k · c5m 0 · c1h 2.39M · r 46.64M',
    cost: '$52.65',
    basePrice: '$5',
  },
  {
    model: 'claude-sonnet-4-6',
    weighted: '111.9k',
    breakdown: 'in 12 · out 1.7k · c5m 0 · c1h 39.9k · r 236.4k',
    cost: '$0.34',
    basePrice: '$3',
  },
]

const WEIGHT_SCALING: { label: string; weight: string }[] = [
  { label: 'input', weight: '1' },
  { label: 'output', weight: '5' },
  { label: 'cache create 5m', weight: '1.25' },
  { label: 'cache create 1h', weight: '2' },
  { label: 'cache read', weight: '0.1' },
]

type SkillRow = { skill: string; usage: string }

const SKILL_ROWS: SkillRow[] = [
  { skill: 'splash', usage: 'claude-opus-4-7 4.8M' },
  { skill: 'opord', usage: 'claude-opus-4-7 1.3M' },
  { skill: 'exfil', usage: 'claude-opus-4-7 812.1k' },
  { skill: 'warno', usage: 'claude-opus-4-7 212.9k' },
  { skill: 'infil', usage: 'claude-sonnet-4-6 111.9k' },
  { skill: 'fob', usage: 'claude-opus-4-7 108.9k' },
  { skill: 'recon', usage: 'claude-opus-4-7 81k' },
  { skill: '(none)', usage: 'claude-opus-4-7 3.21M' },
]

const TOOLS_BREAKDOWN =
  'Edit 105 · Bash 84 · Read 60 · Write 5 · Skill 2 · Agent 1 · AskUserQuestion 1'

export function RetrospectMockup() {
  return (
    <BrowserFrame title='NAHOLO OPERATION STATS'>
      <div className='flex flex-col gap-4 text-sm'>
        {/* Totals */}
        <div className='grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-4'>
          <Stat label='Approx. cost' value='$52.98' />
          <Stat label='Transcripts' value='1' />
          <Stat label='Messages' value='708 (298 user / 410 asst)' />
          <Stat label='Transcript time' value='2h 6m' />
        </div>

        {/* Per-model usage */}
        <div className='flex flex-col gap-1 border-t pt-3'>
          {MODEL_ROWS.map((row) => (
            <PerModelRow key={row.model} row={row} />
          ))}
        </div>

        {/* Skills + Tools */}
        <div className='flex flex-col gap-3 border-t pt-3 text-xs'>
          <div className='flex items-start gap-3'>
            <span className='w-12 shrink-0 text-muted-foreground'>Skills</span>
            <div className='flex flex-col gap-1'>
              {SKILL_ROWS.map((row) => (
                <div
                  key={row.skill}
                  className='flex flex-wrap items-baseline gap-x-2'
                >
                  <span className='font-medium'>{row.skill}</span>
                  <span className='text-muted-foreground'>{row.usage}</span>
                </div>
              ))}
              <span className='text-[10px] text-muted-foreground/70'>
                weighted tokens attributed to each (skill, model)
              </span>
            </div>
          </div>
          <div className='flex items-start gap-3'>
            <span className='w-12 shrink-0 text-muted-foreground'>Tools</span>
            <div className='flex flex-col gap-1'>
              <span className='font-medium tabular-nums'>258</span>
              <div className='pr-4 font-mono text-muted-foreground'>
                {TOOLS_BREAKDOWN}
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

function PerModelRow({ row }: { row: ModelRow }) {
  return (
    <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-xs'>
      <div className='flex flex-wrap items-baseline gap-x-2'>
        <span className='font-mono font-medium'>{row.model}</span>
        <span className='text-muted-foreground tabular-nums'>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='cursor-help underline decoration-dotted underline-offset-2'>
                {row.weighted}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className='flex flex-col gap-0.5 text-xs tabular-nums'>
                <div className='font-medium'>Weight scaling</div>
                {WEIGHT_SCALING.map((w) => (
                  <div key={w.label}>
                    {w.label} × {w.weight}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>{' '}
          {`(weighted, ${row.breakdown})`}
        </span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className='cursor-help font-medium tabular-nums underline decoration-dotted underline-offset-2'>
            {row.cost}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <span className='text-xs tabular-nums'>
            Base token price: {row.basePrice}/MTok
          </span>
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
