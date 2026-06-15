import select from '@inquirer/select'

export async function pickLocale(): Promise<string | null> {
  return select<string | null>({
    message: 'Choose a locale for this profile',
    choices: [
      { name: 'English', value: null },
      { name: '한국어 (Korean)', value: 'Korean' },
      { name: '日本語 (Japanese)', value: 'Japanese' },
      { name: '中文 (Chinese)', value: 'Chinese' },
      { name: 'Español (Spanish)', value: 'Spanish' },
      { name: 'Français (French)', value: 'French' },
      { name: 'Deutsch (German)', value: 'German' },
      { name: 'Português (Portuguese)', value: 'Portuguese' },
    ],
  })
}
