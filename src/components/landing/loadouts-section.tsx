import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { BriefingLabel } from './briefing-label'
import { InlineCode } from './inline-code'
import { CollectIntelMockup } from './mockups/collect-intel-mockup'
import { OperateTerminalMockup } from './mockups/operate-terminal-mockup'
import { RetrospectMockup } from './mockups/retrospect-mockup'
import { Section } from './section'

type Feature = {
  id: 'tracker' | 'cli' | 'stats'
  mockup: React.ReactNode
}

const FEATURES: Feature[] = [
  { id: 'tracker', mockup: <CollectIntelMockup /> },
  { id: 'cli', mockup: <OperateTerminalMockup /> },
  { id: 'stats', mockup: <RetrospectMockup /> },
]

export function LoadoutsSection() {
  const t = useTranslations('landing')

  return (
    <Section>
      <BriefingLabel>{t('loadouts.briefing')}</BriefingLabel>
      <h2 className='mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        {t('loadouts.heading')}
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        {t('loadouts.lead')}
      </p>

      <div className='mt-12 space-y-12'>
        {FEATURES.map((feature, index) => {
          const mockupLeft = index % 2 === 1
          return (
            <div
              key={feature.id}
              className='grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12'
            >
              <div className={cn(mockupLeft && 'md:order-2')}>
                <div className='font-mono text-[11px] uppercase tracking-[0.18em] text-amber-600 dark:text-amber-500'>
                  {t(`loadouts.features.${feature.id}.kicker`)}
                </div>
                <h3 className='mt-2.5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50'>
                  {t(`loadouts.features.${feature.id}.title`)}
                </h3>
                <div className='mt-3 space-y-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
                  {t.rich(`loadouts.features.${feature.id}.body`, {
                    p: (chunks) => <p>{chunks}</p>,
                    code: (chunks) => <InlineCode>{chunks}</InlineCode>,
                    b: (chunks) => (
                      <strong className='font-semibold text-zinc-900 dark:text-zinc-50'>
                        {chunks}
                      </strong>
                    ),
                  })}
                </div>
              </div>
              <div className={cn('w-full', mockupLeft && 'md:order-1')}>
                {feature.mockup}
              </div>
            </div>
          )
        })}
      </div>

      <div className='mt-12 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tracking-[0.08em] text-zinc-500 dark:text-zinc-400'>
        <span className='text-zinc-400 dark:text-zinc-500'>
          {t('loadouts.gearCheck.label')}
        </span>
        <span>Claude Code</span>
        <span className='text-zinc-300 dark:text-zinc-600'>/</span>
        <span>macOS + Node 22+</span>
        <span className='text-zinc-400 dark:text-zinc-500'>
          {t('loadouts.gearCheck.note')}
        </span>
      </div>
    </Section>
  )
}
