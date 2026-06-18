export type Chapter = {
  slug: string
  number: string
  label: string
  body: string
}

export const chapters: Chapter[] = [
  {
    slug: '',
    number: '00',
    label: 'Overview',
    body: 'The manual at a glance.',
  },
  {
    slug: 'quick-start',
    number: '01',
    label: 'Quick Start',
    body: 'Learn the cycle by running it once.',
  },
  {
    slug: 'primer',
    number: '02',
    label: 'Primer',
    body: 'Let the agent move fast. Keep the judgment yours.',
  },
  {
    slug: 'readiness',
    number: '03',
    label: 'Readiness',
    body: 'One-time setup before the first /infil.',
  },
  {
    slug: 'workflow',
    number: '04',
    label: 'Workflow',
    body: 'Each skill, in depth.',
  },
  {
    slug: 'logistics',
    number: '05',
    label: 'Logistics',
    body: 'The precise contracts for every skill, file, and tool.',
  },
  {
    slug: 'sere',
    number: '06',
    label: 'S.E.R.E.',
    body: 'The recovery matrix when the cycle stalls.',
  },
  {
    slug: 'customize',
    number: '07',
    label: 'Customize',
    body: 'From bundled cycle to a team-owned binary.',
  },
  {
    slug: 'glossary',
    number: '08',
    label: 'Glossary',
    body: 'Military terms, naholo usage.',
  },
]

export function chapterHref(chapter: Chapter): string {
  return `/field-manual${chapter.slug ? `/${chapter.slug}` : ''}`
}
