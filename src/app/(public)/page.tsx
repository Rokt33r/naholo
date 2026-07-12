import type { Metadata } from 'next'
import { ClosingCTA } from '@/components/landing/closing-cta'
import { Payoff } from '@/components/landing/payoff'
import { Hero } from '@/components/landing/hero'
import { Requirements } from '@/components/landing/requirements'
import { WhyItWorks } from '@/components/landing/why-it-works'
import { HowItWorks } from '@/components/landing/how-it-works'
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
      <Payoff />
      <HowItWorks />
      <WhyItWorks />
      <Requirements />
      <ClosingCTA isAuthed={isAuthed} />
    </div>
  )
}
