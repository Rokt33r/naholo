'use client'

import { Menu } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeMenuItems } from '@/components/theme-switcher'
import { LanguageMenuItems } from './language-switcher'

export function MobilePublicNavMenu({
  githubUrl,
  isAuthed,
}: {
  githubUrl: string
  isAuthed: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' aria-label='Open menu'>
          <Menu className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {isAuthed ? (
          <DropdownMenuItem asChild className='min-[426px]:hidden'>
            <Link href='/app'>Enter ops room</Link>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem asChild className='min-[426px]:hidden'>
              <Link href='/sign-in'>Sign In</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className='min-[426px]:hidden'>
              <Link href='/sign-up'>Sign Up</Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator className='min-[426px]:hidden' />
        <DropdownMenuItem asChild>
          <a href={githubUrl} target='_blank' rel='noopener noreferrer'>
            <span className='flex-1'>GitHub</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href='/field-manual'>Field Manual</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href='/patchnotes'>Patchnotes</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href='/pricing'>Pricing</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ThemeMenuItems />
        <DropdownMenuSeparator />
        <LanguageMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
