import { useTranslations } from 'next-intl'
import { BriefingLabel } from './briefing-label'
import { Section } from './section'

type Stat = {
  id: 'review' | 'tokens' | 'throughput'
  footnoted?: boolean
}

const STATS: Stat[] = [
  { id: 'review' },
  { id: 'tokens', footnoted: true },
  { id: 'throughput', footnoted: true },
]

export function YieldSection() {
  const t = useTranslations('landing')

  return (
    <Section>
      <BriefingLabel>{t('yield.briefing')}</BriefingLabel>
      <h2 className='mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        {t('yield.heading')}
      </h2>

      <div className='mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 sm:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-800'>
        {STATS.map((stat) => (
          <div key={stat.id} className='bg-zinc-50 p-8 dark:bg-zinc-950'>
            <div className='text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50'>
              {t(`yield.stats.${stat.id}.value`)}
              {stat.footnoted === true && (
                <span className='text-xl text-zinc-400 dark:text-zinc-600'>
                  *
                </span>
              )}
            </div>
            <p className='mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
              {t(`yield.stats.${stat.id}.body`)}
            </p>
          </div>
        ))}
      </div>

      <p className='mt-4 font-mono text-[11px] tracking-[0.06em] text-zinc-400 dark:text-zinc-500'>
        {t('yield.footnote')}
      </p>
    </Section>
  )
}
