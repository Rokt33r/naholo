import { BriefingLabel } from './briefing-label'
import { Section } from './section'

const LEGEND: Array<{ code: string; label: string; blurb: string }> = [
  {
    code: '/infil',
    label: 'INFIL',
    blurb: 'Pull intel from the server into your worktree.',
  },
  {
    code: '/spec',
    label: 'SPEC',
    blurb: 'Draft the plan, spec, and objective list.',
  },
  {
    code: '/ship',
    label: 'SHIP',
    blurb: 'Execute objectives, code by code.',
  },
  {
    code: '/sitrep',
    label: 'SITREP',
    blurb: 'Push a checkpoint mid-mission, stay in ops.',
  },
  {
    code: '/exfil',
    label: 'EXFIL',
    blurb: 'Close out, log the debrief, extract.',
  },
]

export function OperationLoop() {
  return (
    <Section>
      <BriefingLabel>{'// 02 · Operation loop'}</BriefingLabel>
      <h2 className='mt-4 max-w-3xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        The loop.
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        Five phases, one mission. Infil the intel, brief the plan, ship the
        code, sitrep the checkpoint, exfil the diff — every operation runs the
        same cycle.
      </p>

      <div className='mt-12 overflow-x-auto rounded-lg border border-zinc-200 bg-white/40 p-6 dark:border-zinc-800 dark:bg-zinc-900/40'>
        <TacticalMapSvg />
      </div>

      <ul className='mt-8 grid grid-cols-2 gap-4 md:grid-cols-5'>
        {LEGEND.map((item) => (
          <li
            key={item.code}
            className='rounded-md border border-zinc-200 bg-white/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60'
          >
            <div className='font-mono text-xs uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500'>
              {item.label}
            </div>
            <div className='mt-1 font-mono text-sm text-zinc-900 dark:text-zinc-100'>
              {item.code}
            </div>
            <p className='mt-2 text-sm leading-5 text-zinc-600 dark:text-zinc-400'>
              {item.blurb}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function TacticalMapSvg() {
  // Main line: INFIL (80) → SPEC (240) → SHIP (400) → EXFIL (720), y = 150.
  // SITREP (400, 40) branches up from SHIP and loops back.
  const nodes = [
    { id: 'infil', x: 80, y: 150, code: '/infil', label: 'INFIL' },
    { id: 'spec', x: 240, y: 150, code: '/spec', label: 'SPEC' },
    { id: 'ship', x: 400, y: 150, code: '/ship', label: 'SHIP', active: true },
    { id: 'exfil', x: 720, y: 150, code: '/exfil', label: 'EXFIL' },
  ]
  const sitrep = { x: 560, y: 40, code: '/sitrep', label: 'SITREP' }

  return (
    <svg
      viewBox='0 0 800 260'
      preserveAspectRatio='xMidYMid meet'
      className='h-auto w-full text-zinc-400 dark:text-zinc-600'
    >
      <defs>
        <marker
          id='arrow'
          viewBox='0 0 10 10'
          refX='8'
          refY='5'
          markerWidth='6'
          markerHeight='6'
          orient='auto-start-reverse'
        >
          <path d='M 0 0 L 10 5 L 0 10 z' fill='currentColor' />
        </marker>
        <marker
          id='arrow-dash'
          viewBox='0 0 10 10'
          refX='8'
          refY='5'
          markerWidth='6'
          markerHeight='6'
          orient='auto-start-reverse'
        >
          <path d='M 0 0 L 10 5 L 0 10 z' fill='currentColor' />
        </marker>
      </defs>

      {/* Main line connectors */}
      <path
        d='M 128 150 L 192 150'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.5'
        markerEnd='url(#arrow)'
      />
      <path
        d='M 288 150 L 352 150'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.5'
        markerEnd='url(#arrow)'
      />
      <path
        d='M 448 150 L 672 150'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.5'
        markerEnd='url(#arrow)'
      />

      {/* SITREP branch out of SHIP, loop back */}
      <path
        d='M 400 126 C 400 80, 520 40, 560 40'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.25'
        strokeDasharray='4 4'
        className='text-amber-500 dark:text-amber-400'
      />
      <path
        d='M 560 64 C 520 120, 440 130, 422 142'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.25'
        strokeDasharray='4 4'
        markerEnd='url(#arrow-dash)'
        className='text-amber-500 dark:text-amber-400'
      />

      {nodes.map((n) => (
        <MapNode key={n.id} {...n} />
      ))}
      <MapNode {...sitrep} accent />
    </svg>
  )
}

function MapNode({
  x,
  y,
  code,
  label,
  active,
  accent,
}: {
  x: number
  y: number
  code: string
  label: string
  active?: boolean
  accent?: boolean
}) {
  const w = 96
  const h = 48
  const rectX = x - w / 2
  const rectY = y - h / 2
  return (
    <g>
      <rect
        x={rectX}
        y={rectY}
        width={w}
        height={h}
        rx='4'
        className={
          active || accent
            ? 'fill-amber-500/10 stroke-amber-500 dark:fill-amber-400/10 dark:stroke-amber-400'
            : 'fill-white/70 stroke-zinc-400 dark:fill-zinc-950/60 dark:stroke-zinc-600'
        }
        strokeWidth='1.5'
      />
      <text
        x={x}
        y={y - 4}
        textAnchor='middle'
        className={
          active || accent
            ? 'fill-amber-600 text-[11px] font-bold dark:fill-amber-400'
            : 'fill-zinc-700 text-[11px] font-bold dark:fill-zinc-200'
        }
        style={{
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: '0.2em',
        }}
      >
        {label}
      </text>
      <text
        x={x}
        y={y + 12}
        textAnchor='middle'
        className='fill-zinc-500 text-[10px] dark:fill-zinc-400'
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        {code}
      </text>
    </g>
  )
}
