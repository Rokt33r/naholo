import infilContent from '../../../.claude/skills/infil/SKILL.md'
import exfilContent from '../../../.claude/skills/exfil/SKILL.md'
import reconContent from '../../../.claude/skills/recon/SKILL.md'
import splashContent from '../../../.claude/skills/splash/SKILL.md'
import sitrepContent from '../../../.claude/skills/sitrep/SKILL.md'

export const CORE_LOADOUT_NAME = 'core'

export const coreSkills: { name: string; content: string }[] = [
  { name: 'infil', content: infilContent },
  { name: 'exfil', content: exfilContent },
  { name: 'recon', content: reconContent },
  { name: 'splash', content: splashContent },
  { name: 'sitrep', content: sitrepContent },
]
