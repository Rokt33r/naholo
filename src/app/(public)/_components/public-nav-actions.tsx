'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MobilePublicNavMenu } from './mobile-public-nav-menu'

export function PublicNavActions({ githubUrl }: { githubUrl: string }) {
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/auth/user', { signal: controller.signal })
      .then((response) => {
        setIsAuthed(response.ok)
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        setIsAuthed(false)
      })

    return () => {
      controller.abort()
    }
  }, [])

  return (
    <>
      <div className='hidden items-center gap-4 min-[426px]:flex md:gap-6'>
        {isAuthed ? (
          <Link
            href='/app'
            className='text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
          >
            Enter ops room
          </Link>
        ) : (
          <>
            <Link
              href='/sign-in'
              className='text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
            >
              Sign In
            </Link>
            <Link
              href='/sign-up'
              className='text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
      <div className='md:hidden'>
        <MobilePublicNavMenu githubUrl={githubUrl} isAuthed={isAuthed} />
      </div>
    </>
  )
}
