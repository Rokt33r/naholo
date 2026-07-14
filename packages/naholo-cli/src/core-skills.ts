import infilContent from './skills/infil.md'
import exfilContent from './skills/exfil.md'
import fobContent from './skills/fob.md'
import warnoContent from './skills/warno.md'
import raidContent from './skills/raid.md'
import fragoContent from './skills/frago.md'
import opordContent from './skills/opord.md'
import splashContent from './skills/splash.md'
import sitrepContent from './skills/sitrep.md'
import chopContent from './skills/chop.md'
import chopchopContent from './skills/chopchop.md'
import nochopContent from './skills/nochop.md'
import reconContent from './skills/recon.md'
import fieldstripContent from './skills/fieldstrip.md'

export const CORE_LOADOUT_NAME = 'core'

export const coreSkills: { name: string; content: string }[] = [
  { name: 'fob', content: fobContent },
  { name: 'infil', content: infilContent },
  { name: 'exfil', content: exfilContent },
  { name: 'warno', content: warnoContent },
  { name: 'raid', content: raidContent },
  { name: 'frago', content: fragoContent },
  { name: 'opord', content: opordContent },
  { name: 'splash', content: splashContent },
  { name: 'sitrep', content: sitrepContent },
  { name: 'chop', content: chopContent },
  { name: 'chopchop', content: chopchopContent },
  { name: 'nochop', content: nochopContent },
  { name: 'recon', content: reconContent },
  { name: 'fieldstrip', content: fieldstripContent },
]
