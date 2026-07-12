import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { BriefingLabel } from './briefing-label'
import { InlineCode } from './inline-code'
import { Section } from './section'

type Step = {
  id: 'infil' | 'warno' | 'opord' | 'splash' | 'continue' | 'exfil'
  commands: string[]
  review?: boolean
  rich?: boolean
}

const STEPS: Step[] = [
  { id: 'infil', commands: ['/infil', '/fob'] },
  { id: 'warno', commands: ['/warno'], review: true },
  { id: 'opord', commands: ['/opord'], review: true },
  { id: 'splash', commands: ['/splash'], review: true },
  { id: 'continue', commands: [], rich: true },
  { id: 'exfil', commands: ['/exfil'] },
]

export function WorkflowSection() {
  const t = useTranslations('landing')

  return (
    <Section>
      <BriefingLabel>{t('workflow.briefing')}</BriefingLabel>
      <h2 className='mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl'>
        {t('workflow.heading')}
      </h2>
      <p className='mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300'>
        {t('workflow.lead')}
      </p>

      <ol className='mt-12 ml-4'>
        {STEPS.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              'relative pl-8',
              index === STEPS.length - 1 ? 'pb-0' : 'pb-8',
            )}
          >
            <span
              className={cn(
                'absolute -left-[17px] top-0 flex size-8 items-center justify-center rounded-full font-mono text-[13px] bg-zinc-900 text-zinc-50 dark:bg-zinc-800 dark:text-zinc-50',
              )}
            >
              {index + 1}
            </span>

            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
                {t(`workflow.steps.${step.id}.title`)}
              </span>
              {step.commands.map((command) => (
                <InlineCode key={command}>{command}</InlineCode>
              ))}
              {step.review === true && (
                <span className='rounded border border-emerald-500/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-emerald-600 dark:border-emerald-400/40 dark:text-emerald-500'>
                  {t(`workflow.steps.${step.id}.review`)}
                </span>
              )}
            </div>
            <p className='mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
              {step.rich === true
                ? t.rich('workflow.steps.continue.body', {
                    code: (chunks) => <InlineCode>{chunks}</InlineCode>,
                  })
                : t(`workflow.steps.${step.id}.body`)}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
