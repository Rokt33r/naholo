import type { Metadata } from 'next'
import { ClosingCTA } from '@/components/landing/closing-cta'
import { Hero } from '@/components/landing/hero'
import { TacticalOverview } from '@/components/landing/tactical-overview'
import { SelectLoadout } from '@/components/landing/select-loadout'
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
      <TacticalOverview />
      <SelectLoadout />
      <ClosingCTA isAuthed={isAuthed} />
    </div>
  )
}
