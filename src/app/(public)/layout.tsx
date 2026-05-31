import { Github } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import icon from '@/app/icon.png'
import { getAuthUser } from '@/server/auth/permissions'

// Placeholder — owner will replace with the actual public repo URL once the
// project is open-sourced.
const GITHUB_URL = 'https://github.com/'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser({ allowedAuthMethods: ['session'] })
  const isAuthed = user != null

  return (
    <div className='flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950'>
      <header className='border-b border-zinc-200 dark:border-zinc-800'>
        <nav className='mx-auto flex max-w-6xl items-center justify-between px-6 py-4'>
          <Link
            href='/'
            className='flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50'
          >
            <Image src={icon} alt='logo' width={50} height={50} />
            naholo
            <span className='rounded bg-amber-100 px-1 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'>
              Alpha
            </span>
          </Link>
          <div className='flex items-center gap-6'>
            <a
              href={GITHUB_URL}
              aria-label='Source repo'
              target='_blank'
              rel='noopener noreferrer'
              className='text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
            >
              <Github className='size-4' />
            </a>
            <Link
              href='/pricing'
              className='text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
            >
              Pricing
            </Link>
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
        </nav>
      </header>

      <main className='flex-1'>{children}</main>

      <footer className='border-t border-zinc-200 dark:border-zinc-800'>
        <div className='mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 py-8 sm:flex-row sm:justify-between'>
          <div className='flex gap-6'>
            <Link
              href='/terms'
              className='text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            >
              Terms
            </Link>
            <Link
              href='/privacy'
              className='text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            >
              Privacy
            </Link>
            <Link
              href='/refund'
              className='text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            >
              Refund Policy
            </Link>
          </div>
          <div className='flex items-center gap-4'>
            <p className='text-sm text-zinc-400 dark:text-zinc-500'>
              &copy; {new Date().getFullYear()} Junyoung Choi. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
