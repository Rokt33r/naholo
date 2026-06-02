import infilContent from './skills/infil.md'
import exfilContent from './skills/exfil.md'
import warnoContent from './skills/warno.md'
import opordContent from './skills/opord.md'
import splashContent from './skills/splash.md'
import sitrepContent from './skills/sitrep.md'
import chopContent from './skills/chop.md'
import chopchopContent from './skills/chopchop.md'
import nochopContent from './skills/nochop.md'

export const CORE_LOADOUT_NAME = 'core'

export const coreSkills: { name: string; content: string }[] = [
  { name: 'infil', content: infilContent },
  { name: 'exfil', content: exfilContent },
  { name: 'warno', content: warnoContent },
  { name: 'opord', content: opordContent },
  { name: 'splash', content: splashContent },
  { name: 'sitrep', content: sitrepContent },
  { name: 'chop', content: chopContent },
  { name: 'chopchop', content: chopchopContent },
  { name: 'nochop', content: nochopContent },
]
