import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { localeAlternates } from '@/i18n/metadata'
import QuickStartEn from './quick-start.en.mdx'
import QuickStartJa from './quick-start.ja.mdx'
import QuickStartKo from './quick-start.ko.mdx'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    title: t('quickStartTitle'),
    alternates: localeAlternates('/field-manual/quick-start', locale),
  }
}

const QUICK_START_BY_LOCALE: Record<string, typeof QuickStartEn> = {
  en: QuickStartEn,
  ko: QuickStartKo,
  ja: QuickStartJa,
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
