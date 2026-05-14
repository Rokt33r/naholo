import infilContent from './skills/infil.md'
import exfilContent from './skills/exfil.md'
import reconContent from './skills/recon.md'
import objsContent from './skills/objs.md'
import splashContent from './skills/splash.md'
import sitrepContent from './skills/sitrep.md'

export const CORE_LOADOUT_NAME = 'core'

export const coreSkills: { name: string; content: string }[] = [
  { name: 'infil', content: infilContent },
  { name: 'exfil', content: exfilContent },
  { name: 'recon', content: reconContent },
  { name: 'objs', content: objsContent },
  { name: 'splash', content: splashContent },
  { name: 'sitrep', content: sitrepContent },
]
