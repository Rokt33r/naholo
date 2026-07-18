'use client'

import { Check, Languages } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type LocaleOption = {
  value: 'en' | 'ko' | 'ja'
  label: string
}

const LOCALE_OPTIONS: LocaleOption[] = [
  { value: 'en', label: 'English' },
  { value: 'ko', label: '한국어' },
  { value: 'ja', label: '日本語' },
]

export function LanguageSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' aria-label='Change language'>
          <Languages className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <LanguageMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function LanguageMenuItems() {
  const pathname = usePathname()
  const router = useRouter()
  const { locale, rest } = parseLocalePath(pathname)

  const handleSelect = (target: LocaleOption['value']) => {
    document.cookie = `NEXT_LOCALE=${target};path=/;max-age=31536000;samesite=lax`
    router.push(buildLocaleHref(rest, target))
  }

  return (
    <>
      {LOCALE_OPTIONS.map((option) => {
        const isActive = locale === option.value
        return (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => handleSelect(option.value)}
          >
            <span className='flex-1'>{option.label}</span>
            {isActive ? <Check className='size-4' /> : null}
          </DropdownMenuItem>
        )
      })}
    </>
  )
}

const LOCALIZED_PREFIXES = ['/field-manual', '/blog']

function parseLocalePath(pathname: string): {
  locale: 'en' | 'ko' | 'ja'
  rest: string
} {
  const segments = pathname.split('/')
  const first = segments[1]
  if (first === 'ko' || first === 'ja') {
    const rest = '/' + segments.slice(2).join('/')
    return {
      locale: first,
      rest: rest === '/' ? '/' : rest.replace(/\/+$/, ''),
    }
  }
  return { locale: 'en', rest: pathname === '' ? '/' : pathname }
}

function buildLocaleHref(rest: string, target: 'en' | 'ko' | 'ja'): string {
  const isLocalized =
    rest === '/' || LOCALIZED_PREFIXES.some((prefix) => rest.startsWith(prefix))
  if (!isLocalized) {
    return target === 'en' ? '/' : `/${target}`
  }
  if (target === 'en') {
    return rest
  }
  return rest === '/' ? `/${target}` : `/${target}${rest}`
}
