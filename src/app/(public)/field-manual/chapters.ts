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
    body: 'Open an op, install the CLI, run the chain, ship your first operation.',
  },
  {
    slug: 'primer',
    number: '02',
    label: 'Primer',
    body: 'Why the default agent loop breaks, and how to fix it.',
  },
  {
    slug: 'readiness',
    number: '03',
    label: 'Readiness',
    body: 'One-time setup before your first operation.',
  },
  {
    slug: 'workflow',
    number: '04',
    label: 'Workflow',
    body: 'Every skill explained in depth.',
  },
  {
    slug: 'logistics',
    number: '05',
    label: 'Logistics',
    body: 'The interface reference for argument shapes, file owners, and MCP tools.',
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
    body: 'Bend or extend the cycle with your own skills and rules.',
  },
]

export function chapterHref(chapter: Chapter): string {
  return `/field-manual${chapter.slug ? `/${chapter.slug}` : ''}`
}
