import infilContent from './skills/infil.md'
import exfilContent from './skills/exfil.md'
import warnoContent from './skills/warno.md'
import opordContent from './skills/opord.md'
import fragoContent from './skills/frago.md'
import splashContent from './skills/splash.md'
import sitrepContent from './skills/sitrep.md'

export const CORE_LOADOUT_NAME = 'core'

export const coreSkills: { name: string; content: string }[] = [
  { name: 'infil', content: infilContent },
  { name: 'exfil', content: exfilContent },
  { name: 'warno', content: warnoContent },
  { name: 'opord', content: opordContent },
  { name: 'frago', content: fragoContent },
  { name: 'splash', content: splashContent },
  { name: 'sitrep', content: sitrepContent },
]
