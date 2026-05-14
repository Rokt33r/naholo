import infilContent from './skills/infil/SKILL.md'
import exfilContent from './skills/exfil/SKILL.md'
import reconContent from './skills/recon/SKILL.md'
import objsContent from './skills/objs/SKILL.md'
import splashContent from './skills/splash/SKILL.md'
import sitrepContent from './skills/sitrep/SKILL.md'

export const CORE_LOADOUT_NAME = 'core'

export const coreSkills: { name: string; content: string }[] = [
  { name: 'infil', content: infilContent },
  { name: 'exfil', content: exfilContent },
  { name: 'recon', content: reconContent },
  { name: 'objs', content: objsContent },
  { name: 'splash', content: splashContent },
  { name: 'sitrep', content: sitrepContent },
]
