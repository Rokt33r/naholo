import type { Metadata } from 'next'
import { ClosingCTA } from '@/components/landing/closing-cta'
import { Features } from '@/components/landing/features'
import { Hero } from '@/components/landing/hero'
import { Requirements } from '@/components/landing/requirements'
import { ClassifyOperation } from '@/components/landing/classify-operation'
import { TacticalOverview } from '@/components/landing/tactical-overview'
import { getAuthUser } from '@/server/auth/permissions'

// Landing copy is intentionally English — the extraction-shooter framing
// reads as briefing/mission language. Legal and pricing pages stay Korean.

export const metadata: Metadata = {
  title: 'naholo — task force for your codebase',
  description:
    'Brief the objective, execute the plan, exfil with the diff. naholo runs your coding operations end to end.',
}

export default async function LandingPage() {
  const user = await getAuthUser({
    allowedAuthMethods: ['session'],
  })
  const isAuthed = user != null

  return (
    <div className='not-prose'>
      <Hero isAuthed={isAuthed} />
      <Features />
      <TacticalOverview />
      <Requirements />
      <ClassifyOperation />
      <ClosingCTA isAuthed={isAuthed} />
    </div>
  )
}
