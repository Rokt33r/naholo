import type { ComponentType } from 'react'
import { routing } from '@/i18n/routing'
import * as BuiltNaholoPost from '@/content/blog/1-built-naholo.en.mdx'
import * as BuiltNaholoKo from '@/content/blog/1-built-naholo.ko.mdx'
import * as BuiltNaholoJa from '@/content/blog/1-built-naholo.ja.mdx'

const posts: BlogPost[] = [
  {
    slug: '1-built-naholo',
    publishedAt: '2026-07-18',
    content: { en: BuiltNaholoPost, ko: BuiltNaholoKo, ja: BuiltNaholoJa },
    draft: true,
  },
]

export type Locale = (typeof routing.locales)[number]

type BlogMdxModule = {
  default: ComponentType
  meta: { title: string }
}

export interface BlogPost {
  slug: string
  publishedAt: string
  draft?: boolean
  content: Partial<Record<Locale, BlogMdxModule>>
}

export function listPosts(): BlogPost[] {
  return posts
    .filter((post) => post.draft !== true)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
}

export function listAllPosts(): BlogPost[] {
  return posts
}

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((post) => post.slug === slug)
}
