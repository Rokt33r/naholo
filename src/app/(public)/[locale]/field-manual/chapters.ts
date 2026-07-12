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
    label: 'Primer',
    body: 'Let the agent move fast. Keep the judgment yours.',
  },
  {
    slug: 'quick-start',
    number: '01',
    label: 'Quick Start',
    body: 'Learn the cycle by running it once.',
  },
  {
    slug: 'workflow',
    number: '02',
    label: 'Workflow',
    body: 'Each skill, in depth.',
  },
  {
    slug: 'logistics',
    number: '03',
    label: 'Logistics',
    body: 'The precise contracts for every skill, file, and tool.',
  },
  {
    slug: 'sere',
    number: '04',
    label: 'S.E.R.E.',
    body: 'The recovery matrix when the cycle stalls.',
  },
  {
    slug: 'customize',
    number: '05',
    label: 'Customize',
    body: 'From bundled cycle to a team-owned binary.',
  },
  {
    slug: 'glossary',
    number: '06',
    label: 'Glossary',
    body: 'Military terms, naholo usage.',
  },
]

export function chapterHref(chapter: Chapter): string {
  return `/field-manual${chapter.slug ? `/${chapter.slug}` : ''}`
}
