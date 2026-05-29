import { MonitorCog } from 'lucide-react'
import { BriefingLabel } from './briefing-label'
import { Section } from './section'

const ICON_BASE = 'https://unpkg.com/simple-icons@v16/icons'

function BrandIcon({ slug, alt }: { slug: string; alt: string }) {
  return (
    <img
      height='28'
      width='28'
      src={`${ICON_BASE}/${slug}.svg`}
      alt={alt}
      className='dark:invert'
    />
  )
}

export function Requirements() {
  return (
    <Section>
      <BriefingLabel>{'// 04 · Field requirements'}</BriefingLabel>
      <h2 className='mt-4 max-w-3xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        Gear check.
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        What you need before boots hit the ground.
      </p>

      <div className='mt-12 max-w-2xl divide-y divide-zinc-200 dark:divide-zinc-800'>
        {/* AI Coding Assistant */}
        <div className='pb-8'>
          <span className='font-mono text-xs uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500'>
            AI Coding Assistant
          </span>
          <div className='mt-4 flex items-center gap-3'>
            <BrandIcon slug='claude' alt='Claude' />
            <span className='text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
              Claude Code
            </span>
          </div>
          <p className='mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400'>
            OpenAI Codex and Google Gemini CLI will be supported later.
          </p>
        </div>

        {/* Runtime */}
        <div className='py-8'>
          <span className='font-mono text-xs uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500'>
            Platform for CLI
          </span>
          <div className='mt-4 flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              <BrandIcon slug='apple' alt='macOS' />
              <span className='text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
                macOS
              </span>
            </div>
            <span className='text-zinc-300 dark:text-zinc-600'>/</span>
            <div className='flex items-center gap-2'>
              <BrandIcon slug='nodedotjs' alt='Node.js' />
              <span className='text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
                Node.js v22+
              </span>
            </div>
          </div>
          <p className='mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400'>
            May work on other Unix systems — not yet confirmed. Linux and
            Windows will be supported later.
          </p>
        </div>

        {/* Development Tool */}
        <div className='pt-8'>
          <span className='font-mono text-xs uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500'>
            Development Tool
          </span>
          <div className='mt-4 flex items-center gap-3'>
            <MonitorCog className='h-7 w-7 text-zinc-700 dark:text-zinc-300' />
            <span className='text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
              IDE recommended
            </span>
          </div>
          <p className='mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400'>
            Workflow involves reviewing and editing markdown docs.
          </p>
          <ul className='mt-2 space-y-1.5 text-sm leading-6 text-zinc-500 dark:text-zinc-400'>
            <li className='flex items-start gap-2'>
              <span className='mt-2 h-1 w-1 flex-none rounded-full bg-zinc-400 dark:bg-zinc-600' />
              <span>
                Only tested with VS Code + Claude Code for VS Code extension.
              </span>
            </li>
            <li className='flex items-start gap-2'>
              <span className='mt-2 h-1 w-1 flex-none rounded-full bg-zinc-400 dark:bg-zinc-600' />
              <span>
                Doesn&apos;t work well with chat-only tools like Claude Code
                Desktop — editing experience is limited.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </Section>
  )
}
