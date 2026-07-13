import { useTranslations } from 'next-intl'
import { BriefingLabel } from './briefing-label'
import { Section } from './section'

type Gate = {
  id: 'warno' | 'opord' | 'splash'
  skill: string
}

const GATES: Gate[] = [
  { id: 'warno', skill: '/warno' },
  { id: 'opord', skill: '/opord' },
  { id: 'splash', skill: '/splash' },
]

export function ContractsSection() {
  const t = useTranslations('landing')

  return (
    <Section>
      <BriefingLabel>{t('contracts.briefing')}</BriefingLabel>
      <h2 className='mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        {t('contracts.heading')}
      </h2>
      <p className='mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        {t('contracts.lead')}
      </p>

      <div className='mt-12 border-b border-zinc-200 dark:border-zinc-800'>
        {GATES.map((gate) => (
          <div
            key={gate.id}
            className='grid grid-cols-1 gap-2 border-t border-zinc-200 py-6 md:grid-cols-[230px_1fr] md:gap-8 dark:border-zinc-800'
          >
            <div className='font-mono text-sm uppercase tracking-[0.1em] text-amber-600 dark:text-amber-500'>
              {t(`contracts.gates.${gate.id}.label`)}
              <div className='mt-1 text-[11px] tracking-[0.15em] text-zinc-400 dark:text-zinc-500'>
                {gate.skill}
              </div>
            </div>
            <div>
              <div className='text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
                {t(`contracts.gates.${gate.id}.title`)}
              </div>
              <p className='mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
                {t(`contracts.gates.${gate.id}.body`)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
