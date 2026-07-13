import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { DeploymentSection } from '@/components/landing/deployment-section'
import { YieldSection } from '@/components/landing/yield-section'
import { Hero } from '@/components/landing/hero'
import { LoadoutsSection } from '@/components/landing/loadouts-section'
import { ContractsSection } from '@/components/landing/contracts-section'
import { WorkflowSection } from '@/components/landing/workflow-section'
import { localeAlternates } from '@/i18n/metadata'
import { getAuthUser } from '@/server/auth/permissions'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    title: t('landingTitle'),
    description: t('landingDescription'),
    alternates: localeAlternates('/', locale),
  }
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await getAuthUser({
    allowedAuthMethods: ['session'],
  })
  const isAuthed = user != null

  return (
    <div className='not-prose'>
      <Hero isAuthed={isAuthed} />
      <YieldSection />
      <WorkflowSection />
      <ContractsSection />
      <LoadoutsSection />
      <DeploymentSection isAuthed={isAuthed} />
    </div>
  )
}
