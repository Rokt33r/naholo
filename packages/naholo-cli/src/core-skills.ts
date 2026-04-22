import infilContent from '../../../.claude/skills/infil/SKILL.md'
import exfilContent from '../../../.claude/skills/exfil/SKILL.md'
import specContent from '../../../.claude/skills/spec/SKILL.md'
import shipContent from '../../../.claude/skills/ship/SKILL.md'
import sitrepContent from '../../../.claude/skills/sitrep/SKILL.md'

export const CORE_LOADOUT_NAME = 'core'

export const coreSkills: { name: string; content: string }[] = [
  { name: 'infil', content: infilContent },
  { name: 'exfil', content: exfilContent },
  { name: 'spec', content: specContent },
  { name: 'ship', content: shipContent },
  { name: 'sitrep', content: sitrepContent },
]
