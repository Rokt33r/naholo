export type ChapterId =
  | 'primer'
  | 'quickStart'
  | 'workflow'
  | 'logistics'
  | 'sere'
  | 'customize'
  | 'glossary'

export type Chapter = {
  id: ChapterId
  slug: string
  number: string
}

export const chapters: Chapter[] = [
  { id: 'primer', slug: '', number: '00' },
  { id: 'quickStart', slug: 'quick-start', number: '01' },
  { id: 'workflow', slug: 'workflow', number: '02' },
  { id: 'logistics', slug: 'logistics', number: '03' },
  { id: 'sere', slug: 'sere', number: '04' },
  { id: 'customize', slug: 'customize', number: '05' },
  { id: 'glossary', slug: 'glossary', number: '06' },
]

export function chapterHref(chapter: Chapter): string {
  return `/field-manual${chapter.slug ? `/${chapter.slug}` : ''}`
}
