import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import QuickStartEn from './quick-start.en.mdx'

export const metadata: Metadata = {
  title: 'Quick Start — Field Manual — naholo',
}

const QUICK_START_BY_LOCALE: Record<string, typeof QuickStartEn> = {
  en: QuickStartEn,
}

export default async function QuickStartPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const Content = QUICK_START_BY_LOCALE[locale] ?? QuickStartEn
  return <Content />
}
