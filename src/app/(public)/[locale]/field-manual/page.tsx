import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import PrimerEn from './primer.en.mdx'
import PrimerJa from './primer.ja.mdx'
import PrimerKo from './primer.ko.mdx'

export const metadata: Metadata = {
  title: 'Field Manual — naholo',
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
