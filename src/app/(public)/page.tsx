import type { Metadata } from 'next'
import { ClosingCTA } from '@/components/landing/closing-cta'
import { Doctrine } from '@/components/landing/doctrine'
import { FieldToolkit } from '@/components/landing/field-toolkit'
import { Hero } from '@/components/landing/hero'
import { MissionHQ } from '@/components/landing/mission-hq'
import { Requirements } from '@/components/landing/requirements'
import { ClearanceClassification } from '@/components/landing/clearance-classification'
import { TacticalOverview } from '@/components/landing/tactical-overview'
import { getAuthUser } from '@/server/auth/permissions'

// Landing copy is intentionally English — the extraction-shooter framing
// reads as briefing/mission language. Legal and pricing pages stay Korean.

export const metadata: Metadata = {
  title: 'naholo — coding ops, end to end',
  description:
    'AI coding without the spiral. naholo runs your coding ops end to end — infil into the codebase, brief the task, ship in splashes, exfil with the diff.',
}

export default async function LandingPage() {
  const user = await getAuthUser({
    allowedAuthMethods: ['session'],
  })
  const isAuthed = user != null

  return (
    <div className='not-prose'>
      <Hero isAuthed={isAuthed} />
      <Doctrine />
      <TacticalOverview />
      <MissionHQ />
      <FieldToolkit />
      <ClearanceClassification />
      <Requirements />
      <ClosingCTA isAuthed={isAuthed} />
    </div>
  )
}
