import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { getPost, listAllPosts, type Locale } from '@/lib/blog'
import { localeAlternates } from '@/i18n/metadata'
import { formatPublishDate } from '@/lib/date-utils'

export function generateStaticParams() {
  return listAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const post = getPost(slug)
  if (post == null) {
    return {}
  }
  const mod = post.content[locale as Locale] ?? post.content.en
  return {
    title: mod?.meta.title,
    alternates: localeAlternates(`/blog/${slug}`, locale),
  }
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const post = getPost(slug)
  if (post == null) {
    notFound()
  }

  const mod = post.content[locale as Locale] ?? post.content.en
  if (mod == null) {
    notFound()
  }

  const Content = mod.default

  return (
    <div className='mx-auto w-full max-w-3xl px-6 py-12'>
      <time
        dateTime={post.publishedAt}
        className='font-mono text-sm text-zinc-500 dark:text-zinc-400'
      >
        {formatPublishDate(post.publishedAt)}
      </time>
      <article className='prose mt-4 max-w-none dark:prose-invert'>
        <Content />
      </article>
    </div>
  )
}
