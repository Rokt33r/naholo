import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { DeploymentSection } from '@/components/landing/deployment-section'
import { YieldSection } from '@/components/landing/yield-section'
import { Hero } from '@/components/landing/hero'
import { LoadoutsSection } from '@/components/landing/loadouts-section'
import { ContractsSection } from '@/components/landing/contracts-section'
import { WorkflowSection } from '@/components/landing/workflow-section'
import { getAuthUser } from '@/server/auth/permissions'

// Landing copy is intentionally English — the extraction-shooter framing
// reads as briefing/mission language. Legal and pricing pages stay Korean.

export const metadata: Metadata = {
  title: 'naholo — coding ops, end to end',
  description:
    'AI coding without the spiral. naholo runs your coding ops end to end — infil into the codebase, brief the task, ship in splashes, exfil with the diff.',
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
