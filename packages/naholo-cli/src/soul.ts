import select from '@inquirer/select'
import defaultSoul from './souls/default.md'

export const DEFAULT_K4TYA_SOUL = defaultSoul

export async function pickSoul(): Promise<string | null> {
  return select<string | null>({
    message: 'Choose a soul for this profile',
    choices: [
      { name: 'Default', value: DEFAULT_K4TYA_SOUL },
      {
        name: 'None — recommended if you already use a system prompt',
        value: null,
      },
    ],
  })
}
