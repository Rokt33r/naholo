import Link from 'next/link'

const chapters = [
  { slug: '', label: 'Overview' },
  { slug: 'quick-start', label: 'Quick Start' },
  { slug: 'primer', label: 'Primer' },
  { slug: 'readiness', label: 'Readiness' },
  { slug: 'workflow', label: 'Workflow' },
  { slug: 'logistics', label: 'Logistics' },
  { slug: 'sere', label: 'S.E.R.E.' },
  { slug: 'customize', label: 'Customize' },
]

export default function FieldManualLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='mx-auto w-full max-w-6xl px-6 py-12'>
      <div className='flex flex-col gap-10 lg:flex-row lg:gap-12'>
        <aside className='lg:w-56 lg:shrink-0'>
          <nav className='lg:sticky lg:top-12'>
            <p className='font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400'>
              // Chapters
            </p>
            <ul className='mt-4 space-y-2'>
              {chapters.map((chapter) => (
                <li key={chapter.slug}>
                  <Link
                    href={`/field-manual${chapter.slug ? `/${chapter.slug}` : ''}`}
                    className='text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
                  >
                    {chapter.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <article className='prose dark:prose-invert max-w-none flex-1'>
          {children}
        </article>
      </div>
    </div>
  )
}
