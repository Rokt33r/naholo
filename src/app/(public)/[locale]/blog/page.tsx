import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { listPosts, type Locale } from '@/lib/blog'
import { localeAlternates } from '@/i18n/metadata'
import { Link } from '@/i18n/navigation'
import { formatPublishDate } from '@/lib/date-utils'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    title: t('blogTitle'),
    alternates: localeAlternates('/blog', locale),
  }
}

export default async function BlogListPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const posts = listPosts()

  return (
    <div className='mx-auto w-full max-w-3xl px-6 py-12'>
      <h1 className='text-2xl font-bold text-zinc-900 dark:text-zinc-50'>
        Blog
      </h1>

      <ul className='mt-10 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800'>
        {posts.length === 0 && (
          <p className='text-zinc-500 dark:text-zinc-400'>No entry yet</p>
        )}
        {posts.map((post) => {
          const mod = post.content[locale as Locale] ?? post.content.en
          return (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className='group flex items-baseline justify-between gap-4 py-4'
              >
                <span className='text-zinc-900 group-hover:text-amber-600 dark:text-zinc-50 dark:group-hover:text-amber-500'>
                  {mod?.meta.title}
                </span>
                <time
                  dateTime={post.publishedAt}
                  className='shrink-0 font-mono text-sm text-zinc-500 dark:text-zinc-400'
                >
                  {formatPublishDate(post.publishedAt)}
                </time>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
