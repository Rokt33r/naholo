import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { localeAlternates } from '@/i18n/metadata'
import PrimerEn from './primer.en.mdx'
import PrimerJa from './primer.ja.mdx'
import PrimerKo from './primer.ko.mdx'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    title: t('primerTitle'),
    alternates: localeAlternates('/field-manual', locale),
  }
}

const PRIMER_BY_LOCALE: Record<string, typeof PrimerEn> = {
  en: PrimerEn,
  ko: PrimerKo,
  ja: PrimerJa,
}

export default async function FieldManualPrimerPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const Content = PRIMER_BY_LOCALE[locale] ?? PrimerEn
  return <Content />
}
