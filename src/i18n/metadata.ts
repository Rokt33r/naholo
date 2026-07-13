import type { Metadata } from 'next'
import { routing } from './routing'

export function localeAlternates(
  pathname: string,
  locale: string,
): Metadata['alternates'] {
  const pathFor = (loc: string) => {
    if (loc === routing.defaultLocale) {
      return pathname
    }
    return pathname === '/' ? `/${loc}` : `/${loc}${pathname}`
  }

  const languages: Record<string, string> = {}
  for (const loc of routing.locales) {
    languages[loc] = pathFor(loc)
  }
  languages['x-default'] = pathname

  return {
    canonical: pathFor(locale),
    languages,
  }
}
